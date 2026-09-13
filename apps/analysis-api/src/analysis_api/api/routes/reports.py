"""Report PDF signed URL and refine / refine-gate."""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from psycopg2.extras import Json, RealDictCursor

from analysis_api.api.deps import bearer_user
from analysis_api.domain.extract import refuse_if_extraction
from analysis_api.domain.tenancy import WRITE_ROLES
from analysis_api.schemas.refine import RefineBody
from thesis_platform.config import Settings
from thesis_platform.db import connect
from thesis_platform.extract import REFUSAL
from thesis_platform.http import complete_openrouter
from thesis_platform.pack import build_variable_pack
from thesis_platform.prompt import load_promoted_body
from thesis_platform.sections import parse_sections_json
from thesis_platform.storage import signed_pdf_url

router = APIRouter()


def _load_report(cur, report_id: str, user_id: str, *, write: bool) -> dict[str, Any]:
    """Read = user_can_read_family. Write = user_can_write_family (owner/member, not viewer)."""
    role_sql = "and fm.member_role in %s" if write else ""
    params: tuple[Any, ...] = (user_id, WRITE_ROLES, report_id) if write else (user_id, report_id)
    cur.execute(
        f"""
        select r.id::text, r.family_id::text, r.created_by::text, r.ticker, r.verdict,
               r.sections, r.pdf_key, r.model_id, r.is_library_sample, r.request_id::text
          from reports r
          join family_members fm
            on fm.family_id = r.family_id
           and fm.user_id = %s
           and fm.is_active = true
           {role_sql}
         where r.id = %s
        """,
        params,
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="not found")
    return dict(row)


@router.get("/reports/{report_id}/pdf")
def get_report_pdf(
    report_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    settings = Settings.from_env()
    user = bearer_user(settings, authorization)
    conn = connect(settings)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        report = _load_report(cur, report_id, user["id"], write=False)
        key = report.get("pdf_key")
        if not key:
            raise HTTPException(status_code=404, detail="pdf not ready")
        url = signed_pdf_url(settings, str(key))
        return {"url": url}
    finally:
        conn.close()


@router.post("/reports/{report_id}/refine-gate")
def refine_gate(
    report_id: str,
    body: RefineBody,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    settings = Settings.from_env()
    user = bearer_user(settings, authorization)
    conn = connect(settings)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        report = _load_report(cur, report_id, user["id"], write=True)
        if report["is_library_sample"]:
            raise HTTPException(status_code=403, detail="sample reports cannot refine")
        if body.confirm and not (body.user_text or "").strip():
            raise HTTPException(status_code=400, detail="enrichment required")
        cur.execute(
            """
            select id, cost_cents_per_run, openrouter_model_id, openrouter_only
              from model_catalog
             where is_refine_gate = true and is_active = true
             order by sort_order
             limit 1
            """
        )
        gate = cur.fetchone()
        if not gate:
            raise HTTPException(status_code=500, detail="no refine-gate model")
        if not body.confirm:
            return {
                "need_confirm": True,
                "model_id": gate["id"],
                "cost_cents": gate["cost_cents_per_run"],
            }
        refused = refuse_if_extraction(body.user_text)
        if refused:
            _insert_usage(cur, report, user["id"], "prompt_extract_attempt", gate["id"], 0)
            _insert_refinement(
                cur,
                report,
                user["id"],
                body.user_text,
                gate["id"],
                refused=True,
                response=REFUSAL,
                proceeded=False,
            )
            conn.commit()
            return {"was_refused": True, "reason": REFUSAL}

        if not settings.openrouter_api_key:
            raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY missing")
        try:
            cur.execute("select thesis_assert_quota(%s)", (report["family_id"],))
        except Exception as exc:
            raise HTTPException(status_code=429, detail="THS-QUOTA-001") from exc
        _prompt_id, gate_body = load_promoted_body(cur, "refine_gate")
        user_pack = json.dumps(
            {
                "ticker": report["ticker"],
                "verdict": report["verdict"],
                "sections": report["sections"],
                "enrichment": body.user_text,
            },
            default=str,
        )
        result = complete_openrouter(
            settings,
            model=str(gate["openrouter_model_id"]),
            openrouter_only=str(gate["openrouter_only"]),
            system=gate_body,
            user=user_pack,
        )
        parsed = parse_sections_json(result.content)
        material = bool(parsed.get("material"))
        reason = str(parsed.get("reason") or "")
        tags = parsed.get("focus_tags") or []
        if not isinstance(tags, list):
            tags = []
        _insert_usage(
            cur,
            report,
            user["id"],
            "refine_gate",
            gate["id"],
            result.cost_cents or gate["cost_cents_per_run"] or 0,
        )
        _insert_refinement(
            cur,
            report,
            user["id"],
            body.user_text,
            gate["id"],
            refused=False,
            response=json.dumps({"material": material, "reason": reason, "focus_tags": tags}),
            proceeded=False,
            focus_tags=[str(t) for t in tags],
            sections={"material": material, "reason": reason, "focus_tags": tags},
        )
        conn.commit()
        return {
            "was_refused": False,
            "material": material,
            "reason": reason,
            "focus_tags": tags,
            "model_id": gate["id"],
        }
    finally:
        conn.close()


@router.post("/reports/{report_id}/refine")
def refine(
    report_id: str,
    body: RefineBody,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    settings = Settings.from_env()
    user = bearer_user(settings, authorization)
    conn = connect(settings)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        report = _load_report(cur, report_id, user["id"], write=True)
        if report["is_library_sample"]:
            raise HTTPException(status_code=403, detail="sample reports cannot refine")
        if body.confirm and not (body.user_text or "").strip():
            raise HTTPException(status_code=400, detail="enrichment required")
        cur.execute(
            "select id, cost_cents_per_run, openrouter_model_id, openrouter_only from model_catalog where id = %s",
            (report["model_id"],),
        )
        model = cur.fetchone()
        if not model:
            raise HTTPException(status_code=500, detail="model missing")
        if not body.confirm:
            return {
                "need_confirm": True,
                "model_id": model["id"],
                "cost_cents": model["cost_cents_per_run"],
            }
        refused = refuse_if_extraction(body.user_text)
        if refused:
            _insert_usage(cur, report, user["id"], "prompt_extract_attempt", model["id"], 0)
            _insert_refinement(
                cur,
                report,
                user["id"],
                body.user_text,
                model["id"],
                refused=True,
                response=REFUSAL,
                proceeded=False,
            )
            conn.commit()
            return {"was_refused": True, "reason": REFUSAL, "billed_refine": False}

        if not settings.openrouter_api_key:
            raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY missing")
        try:
            cur.execute("select thesis_assert_quota(%s)", (report["family_id"],))
        except Exception as exc:
            raise HTTPException(status_code=429, detail="THS-QUOTA-001") from exc
        _prompt_id, system = load_promoted_body(cur, "advisor")
        del _prompt_id
        pack = build_variable_pack(
            {
                "ticker": report["ticker"],
                "enrichment": body.user_text,
                "holdings": [],
                "evidence": [],
                "investor_profiles": {},
            }
        )
        result = complete_openrouter(
            settings,
            model=str(model["openrouter_model_id"]),
            openrouter_only=str(model["openrouter_only"]),
            system=system,
            user=pack,
        )
        sections = parse_sections_json(result.content)
        _insert_usage(
            cur,
            report,
            user["id"],
            "refine",
            model["id"],
            result.cost_cents or model["cost_cents_per_run"] or 0,
        )
        _insert_refinement(
            cur,
            report,
            user["id"],
            body.user_text,
            model["id"],
            refused=False,
            response=result.content[:8000],
            proceeded=True,
            sections=sections,
        )
        conn.commit()
        return {"was_refused": False, "billed_refine": True, "model_id": model["id"]}
    finally:
        conn.close()


def _insert_usage(cur, report: dict[str, Any], user_id: str, kind: str, model_id: str, cents: int) -> None:
    cur.execute(
        """
        insert into usage_events (
          family_id, user_id, kind, model_id, cost_cents, billing_period, report_id
        )
        values (%s, %s, %s::usage_kind, %s, %s, thesis_billing_period_start(), %s)
        """,
        (report["family_id"], user_id, kind, model_id, cents, report["id"]),
    )


def _insert_refinement(
    cur,
    report: dict[str, Any],
    user_id: str,
    text: str,
    model_id: str,
    *,
    refused: bool,
    response: str,
    proceeded: bool,
    focus_tags: list[str] | None = None,
    sections: dict[str, Any] | None = None,
) -> None:
    cur.execute(
        """
        insert into refinements (
          report_id, family_id, created_by, user_text, focus_tags,
          response, was_refused, refusal_reason, model_id, proceeded, sections
        ) values (
          %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """,
        (
            report["id"],
            report["family_id"],
            user_id,
            text,
            focus_tags or [],
            response,
            refused,
            REFUSAL if refused else None,
            model_id,
            proceeded,
            Json(sections or {}),
        ),
    )
