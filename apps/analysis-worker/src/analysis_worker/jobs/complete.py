"""Native-lab framework completion → reports insert (P4-02 / D39)."""
from __future__ import annotations

from typing import Any, Callable
from uuid import UUID

from psycopg2.extensions import connection
from psycopg2.extras import Json, RealDictCursor

from thesis_platform.config import Settings
from thesis_platform.http import complete_chat
from thesis_platform.native_llm import (
    NATIVE_PROVIDERS,
    ChatResult,
    LlmError,
    resolve_provider,
)

from thesis_platform.pack import INVESTOR_PROFILE_PACK_COLUMNS, build_variable_pack
from thesis_platform.prompt import load_promoted_body
from thesis_platform.sections import (
    SectionsError,
    adherence_failures,
    assert_comprehensive,
    mentions_us_options,
    parse_sections_json,
)

from analysis_worker.jobs.claim import set_status
from analysis_worker.jobs.gather import _lenses

CompleteFn = Callable[..., ChatResult]


def complete_request(
    conn: connection,
    settings: Settings,
    request: dict[str, Any],
    *,
    complete_fn: CompleteFn | None = None,
) -> str:
    """Insert reports, return report id. Never returns prompt body."""
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """
        select id, provider, provider_model_id, label, thesis_class
          from model_catalog
         where id = %s and is_active = true
        """,
        (request["model_id"],),
    )
    model = cur.fetchone()
    provider = str(model["provider"]) if model else ""
    native_id = str(model["provider_model_id"]) if model else ""
    if not model or provider not in NATIVE_PROVIDERS or not native_id:
        raise RuntimeError("model_catalog row missing native provider")
    if complete_fn is None:
        provider, native_id, used_id = _lab_for_request(cur, settings, dict(model))
        model = {
            **dict(model),
            "id": used_id,
            "provider": provider,
            "provider_model_id": native_id,
        }

    used_model_id = str(model["id"])
    prompt_id, system = load_promoted_body(cur, "advisor")
    pack = build_variable_pack(_context(cur, request))

    set_status(conn, request["id"], "drafting")
    runner = complete_fn or (
        lambda **kw: complete_chat(
            settings,
            provider=kw["provider"],
            model=kw["model"],
            system=kw["system"],
            user=kw["user"],
        )
    )
    result = runner(
        provider=provider,
        model=native_id,
        system=system,
        user=pack,
    )
    sections = parse_sections_json(result.content)
    lenses = _lenses(request.get("lenses"))
    if set(lenses) >= {"fundamental", "technical", "macro", "news"}:
        assert_comprehensive(sections, str(request.get("intent") or ""))

    fails = adherence_failures(sections)
    if fails:
        set_status(conn, request["id"], "checking")
        redo_user = pack + "\nREDO sections with adherence NO: " + ",".join(fails)
        result = runner(
            provider=provider,
            model=native_id,
            system=system,
            user=redo_user,
        )
        sections = parse_sections_json(result.content)
        if set(lenses) >= {"fundamental", "technical", "macro", "news"}:
            assert_comprehensive(sections, str(request.get("intent") or ""))
        fails = adherence_failures(sections)
        if fails:
            raise SectionsError("adherence still NO: " + ",".join(fails))

    profile = _profile(cur, request["family_id"])
    if profile.get("cannot_trade_us_options") and mentions_us_options(sections):
        raise SectionsError("US options advice forbidden for this profile")

    verdict = _verdict(sections)
    name = f"{request['ticker']} — {verdict}"[:200]
    set_status(conn, request["id"], "checking")
    cur.execute(
        """
        insert into reports (
          request_id, family_id, created_by, name, ticker, verdict,
          sections, charts, prompt_version_id, model_id, token_cost_cents
        ) values (
          %s, %s, %s, %s, %s, %s,
          %s, '{}'::jsonb, %s, %s, %s
        )
        returning id
        """,
        (
            request["id"],
            request["family_id"],
            request["created_by"],
            name,
            request["ticker"],
            verdict,
            Json(sections),
            prompt_id,
            used_model_id,
            result.cost_cents or 0,
        ),
    )
    report_id = str(cur.fetchone()["id"])
    if result.cost_cents is not None:
        cur.execute(
            """
            update usage_events
               set cost_cents = %s
             where request_id = %s and kind = 'search'
            """,
            (result.cost_cents, request["id"]),
        )
    cur.close()
    return report_id


def _lab_for_request(
    cur, settings: Settings, model: dict[str, Any]
) -> tuple[str, str, str]:
    """If the queued lab has no key, use a random keyed lab and its model_catalog row."""
    requested = str(model["provider"])
    try:
        provider = resolve_provider(settings, requested)
    except LlmError as exc:
        raise RuntimeError(str(exc)) from exc
    if provider == requested:
        return requested, str(model["provider_model_id"]), str(model["id"])
    thesis_class = str(model.get("thesis_class") or "quick")
    row = _catalog_for_provider(cur, provider, thesis_class)
    if not row:
        raise RuntimeError(f"no active model_catalog row for fallback lab {provider}")
    return str(row["provider"]), str(row["provider_model_id"]), str(row["id"])


def _catalog_for_provider(cur, provider: str, thesis_class: str) -> dict[str, Any] | None:
    cur.execute(
        """
        select id, provider, provider_model_id, label, thesis_class
          from model_catalog
         where is_active = true and provider = %s
         order by
           case when thesis_class = %s then 0 else 1 end,
           sort_order asc,
           id asc
         limit 1
        """,
        (provider, thesis_class),
    )
    row = cur.fetchone()
    return dict(row) if row else None


def _context(cur, request: dict[str, Any]) -> dict[str, Any]:
    cur.execute(
        """
        select ticker, qty, cost_per_share, native_currency, exchange, company_name
          from holdings
         where family_id = %s
        """,
        (request["family_id"],),
    )
    holdings = [dict(r) for r in cur.fetchall()]
    cur.execute(
        """
        select step0_number, query, excerpt, source_url
          from analysis_evidence
         where request_id = %s
         order by step0_number
        """,
        (request["id"],),
    )
    evidence = [dict(r) for r in cur.fetchall()]
    profile = _profile(cur, request["family_id"])
    return {
        "ticker": request["ticker"],
        "exchange": request.get("exchange"),
        "lenses": _lenses(request.get("lenses")),
        "intent": request.get("intent"),
        "avg_down": request.get("avg_down"),
        "risk_band": request.get("risk_band"),
        "cagr_band": request.get("cagr_band"),
        "tax_residency": request.get("tax_residency"),
        "tax_slab": request.get("tax_slab"),
        "invested_amount": request.get("invested_amount"),
        "portfolio_size": request.get("portfolio_size"),
        "intended_investment": request.get("intended_investment") or 0,
        "run_qty": request.get("run_qty") or 0,
        "run_cost_per_share": request.get("run_cost_per_share") or 0,
        "model_id": request.get("model_id"),
        "clarifications": request.get("clarifications") or {},
        "holdings": holdings,
        "evidence": evidence,
        "investor_profiles": profile,
        "cannot_trade_us_options": bool(profile.get("cannot_trade_us_options")),
    }


def _profile(cur, family_id: UUID | str) -> dict[str, Any]:
    cur.execute(
        f"""
        select {INVESTOR_PROFILE_PACK_COLUMNS}
          from investor_profiles
         where family_id = %s
        """,
        (family_id,),
    )
    row = cur.fetchone()
    return dict(row) if row else {}


def _verdict(sections: dict[str, Any]) -> str:
    raw = sections.get("verdict")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()[:80]
    if isinstance(raw, dict):
        for key in ("call", "label", "verdict"):
            if raw.get(key):
                return str(raw[key])[:80]
    return "Hold"
