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
    available_providers,
    is_truncated,
    resolve_provider,
)

from thesis_platform.pack import INVESTOR_PROFILE_PACK_COLUMNS, build_variable_pack
from thesis_platform.prompt import load_promoted_body
from thesis_platform.sections import (
    SectionsError,
    adherence_failures,
    assert_finished_note,
    is_inflight_sections,
    mentions_us_options,
    missing_comprehensive_keys,
    parse_note_payload,
    strip_progress_keys,
)

from analysis_worker.jobs.claim import set_status
from analysis_worker.jobs.gather import _lenses

CompleteFn = Callable[..., ChatResult]

FINAL_NOTE_SUFFIX = (
    "Write the finished investor note. Include LAYER 1 plain language "
    "(THE BOTTOM LINE, what the company does, business quality, cash, price, "
    "what could go wrong) through END OF ANALYSIS. "
    "Do not return stage_status, retrieval_*, PENDING, or IN_PROGRESS. "
    "If you include a machine-readable JSON block, put it at the end."
)


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
    intent = str(request.get("intent") or "")
    user = pack + "\n" + FINAL_NOTE_SUFFIX
    result, provider, native_id, used_model_id = _run_chat_or_fallback(
        runner,
        cur,
        settings,
        model=dict(model),
        provider=provider,
        native_id=native_id,
        used_model_id=used_model_id,
        system=system,
        user=user,
    )
    sections = _try_parse(result.content)
    if (
        sections is None
        or is_inflight_sections(sections)
        or missing_comprehensive_keys(sections, intent)
    ):
        set_status(conn, request["id"], "checking")
        result = _run_chat(
            runner,
            provider=provider,
            model=native_id,
            system=system,
            user=pack
            + "\n"
            + FINAL_NOTE_SUFFIX
            + "\nThe previous output was a progress dump or incomplete. "
            "Write the finished LAYER 1 note, not retrieval status.",
        )
        sections = parse_note_payload(result.content)
    sections = strip_progress_keys(sections)
    assert_finished_note(sections, intent)

    fails = adherence_failures(sections)
    if fails:
        set_status(conn, request["id"], "checking")
        result = _run_chat(
            runner,
            provider=provider,
            model=native_id,
            system=system,
            user=pack + "\nREDO sections with adherence NO: " + ",".join(fails),
        )
        sections = strip_progress_keys(parse_note_payload(result.content))
        assert_finished_note(sections, intent)
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
        on conflict (request_id) do update set
          name = excluded.name,
          ticker = excluded.ticker,
          verdict = excluded.verdict,
          sections = excluded.sections,
          prompt_version_id = excluded.prompt_version_id,
          model_id = excluded.model_id,
          token_cost_cents = excluded.token_cost_cents,
          updated_at = now()
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


def _run_chat(
    runner: CompleteFn,
    *,
    provider: str,
    model: str,
    system: str,
    user: str,
) -> ChatResult:
    """Call the lab and continue if output was cut off at max_tokens."""
    result = runner(provider=provider, model=model, system=system, user=user)
    chunks = [result.content]
    last = result
    for _ in range(2):
        if not is_truncated(last):
            break
        last = runner(
            provider=provider,
            model=model,
            system=system,
            user=user
            + "\nContinue the note from the last character. Do not restart.\nSo far:\n"
            + "".join(chunks)[-12000:],
        )
        chunks.append(last.content)
    return ChatResult(
        content="".join(chunks),
        response_model=last.response_model,
        cost_cents=last.cost_cents,
        raw=last.raw,
        stop_reason=last.stop_reason,
    )


def _lab_unavailable(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return any(
        token in msg
        for token in ("credit", "billing", "quota", "insufficient", "balance is too low")
    )


def _run_chat_or_fallback(
    runner: CompleteFn,
    cur,
    settings: Settings,
    *,
    model: dict[str, Any],
    provider: str,
    native_id: str,
    used_model_id: str,
    system: str,
    user: str,
) -> tuple[ChatResult, str, str, str]:
    try:
        return (
            _run_chat(
                runner, provider=provider, model=native_id, system=system, user=user
            ),
            provider,
            native_id,
            used_model_id,
        )
    except LlmError as exc:
        if not _lab_unavailable(exc):
            raise
        thesis_class = str(model.get("thesis_class") or "quick")
        for other in available_providers(settings):
            if other == provider:
                continue
            row = _catalog_for_provider(cur, other, thesis_class)
            if not row:
                continue
            out = _run_chat(
                runner,
                provider=str(row["provider"]),
                model=str(row["provider_model_id"]),
                system=system,
                user=user,
            )
            return out, str(row["provider"]), str(row["provider_model_id"]), str(row["id"])
        raise


def _try_parse(raw: str) -> dict[str, Any] | None:
    try:
        return parse_note_payload(raw)
    except SectionsError:
        return None


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
