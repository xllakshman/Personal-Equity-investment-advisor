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
    require_api_key,
)
from thesis_platform.pack import build_variable_pack
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
        select id, provider, provider_model_id, label
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
        require_api_key(settings, provider)

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
            request["model_id"],
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
        "clarifications": request.get("clarifications") or {},
        "holdings": holdings,
        "evidence": evidence,
        "investor_profiles": profile,
        "cannot_trade_us_options": bool(profile.get("cannot_trade_us_options")),
    }


def _profile(cur, family_id: UUID | str) -> dict[str, Any]:
    cur.execute(
        """
        select cannot_trade_us_options, ltcg_holding_months, concentration_cap_pct
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
