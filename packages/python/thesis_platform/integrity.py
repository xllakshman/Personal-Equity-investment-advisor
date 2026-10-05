"""Integrity warnings for new reports only. Never UPDATE old sections. Never prompt body."""
from __future__ import annotations

import re
from typing import Any

from thesis_platform.derived import excerpt_payload
from thesis_platform.edgar import headlines_from_evidence
from thesis_platform.status import (
    FOUND,
    INPUTS_MISSING,
    NOT_COVERED,
    SOURCE_ERROR,
    is_found,
    normalize_status,
)
from thesis_platform.typeset import machine_from_sections

_TAG = re.compile(r"<[^>]*>")
_PROMPTISH = re.compile(
    r"prompt_versions|you are an? |system prompt|advisor prompt",
    re.I,
)
PRICE_ABS = 0.05
PRICE_REL = 0.005
ROIC_ABS = 0.005
MSG_LIMIT = 180


def sanitize_display_text(raw: Any, *, limit: int = MSG_LIMIT) -> str:
    text = _TAG.sub("", str(raw or ""))
    text = " ".join(text.split()).strip()
    if _PROMPTISH.search(text):
        return ""
    return text[:limit]


def news_is_absent(pack: Any) -> bool:
    """True only after a successful US EDGAR fetch with no 8-K/10-Q/10-K headlines."""
    if not isinstance(pack, dict):
        return False
    if normalize_status(pack.get("status")) != FOUND:
        return False
    filings = pack.get("filings")
    if filings is None:
        return False
    if isinstance(filings, list):
        return len(filings) == 0
    return False


def item2_news_pack(ctx: dict[str, Any]) -> dict[str, Any]:
    news = headlines_from_evidence(ctx.get("evidence") if isinstance(ctx, dict) else [])
    status = normalize_status(news.get("status")) or NOT_COVERED
    filings = news.get("filings") if isinstance(news.get("filings"), list) else []
    pack: dict[str, Any] = {
        "status": status,
        "filings_count": len(filings) if status == FOUND else 0,
        "news_absent": news_is_absent({"status": status, "filings": filings}),
    }
    filer = sanitize_display_text(news.get("filer_type"), limit=80)
    if filer:
        pack["filer_type"] = filer
    return pack


def filer_type_from_ctx(ctx: dict[str, Any]) -> str:
    news = headlines_from_evidence(ctx.get("evidence") or [])
    filer = sanitize_display_text(news.get("filer_type"), limit=80)
    if filer:
        return filer
    facts = ctx.get("fundamentals_annual")
    if isinstance(facts, dict):
        return sanitize_display_text(facts.get("filer_type"), limit=80)
    return ""


def coverage_label(ctx: dict[str, Any]) -> str:
    bits: list[str] = []
    news = headlines_from_evidence(ctx.get("evidence") or [])
    news_st = normalize_status(news.get("status"))
    facts = ctx.get("fundamentals_annual") if isinstance(ctx.get("fundamentals_annual"), dict) else {}
    facts_st = normalize_status(facts.get("status"))
    if news_st == NOT_COVERED and facts_st in (None, NOT_COVERED):
        bits.append("EDGAR not covered")
    if news_st == SOURCE_ERROR:
        bits.append("EDGAR headlines error")
    if facts_st == SOURCE_ERROR:
        bits.append("Companyfacts error")
    elif facts_st == INPUTS_MISSING:
        bits.append("Annual facts incomplete")
    fields = facts.get("field_status") if isinstance(facts.get("field_status"), dict) else {}
    if facts_st == FOUND and normalize_status(fields.get("capex")) == INPUTS_MISSING:
        bits.append("Capex missing")
    return " · ".join(bits)


REPAIR_CODES = frozenset({"price_mismatch", "roic_mismatch"})


def needs_integrity_repair(sections: Any, ctx: dict[str, Any] | None) -> bool:
    """True when parsed note JSON price/ROIC disagree with the pack beyond rounding."""
    if not isinstance(sections, dict) or not isinstance(ctx, dict):
        return False
    machine = machine_from_sections(sections)
    codes = {str(row.get("code") or "") for row in integrity_warnings(machine, ctx)}
    return bool(codes & REPAIR_CODES)


def integrity_warnings(machine: Any, ctx: dict[str, Any]) -> list[dict[str, str]]:
    """Compare note JSON to the pack. Rounding matches are not warnings."""
    if not isinstance(machine, dict) or not machine:
        return []
    out: list[dict[str, str]] = []
    pack_close = _pack_close(ctx)
    note_price = _first_number(machine, ("current_price", "price", "close"))
    if pack_close is not None and note_price is not None and not _price_close(note_price, pack_close):
        out.append(
            {
                "code": "price_mismatch",
                "message": sanitize_display_text(
                    f"Note price {_money(note_price)} does not match pack close {_money(pack_close)}."
                ),
            }
        )
    pack_roic = _pack_roic(ctx)
    note_roic = _note_roic(machine)
    if pack_roic is not None and note_roic is not None and not _roic_close(note_roic, pack_roic):
        out.append(
            {
                "code": "roic_mismatch",
                "message": sanitize_display_text(
                    f"Note ROIC {_pct(note_roic)} does not match pack {_pct(pack_roic)}."
                ),
            }
        )
    facts = ctx.get("fundamentals_annual") if isinstance(ctx.get("fundamentals_annual"), dict) else {}
    fields = facts.get("field_status") if isinstance(facts.get("field_status"), dict) else {}
    capex_st = normalize_status(fields.get("capex"))
    fcf_st = normalize_status(fields.get("fcf"))
    note_fcf = _first_number(machine, ("fcf", "free_cash_flow"))
    if (
        is_found(facts.get("status"))
        and capex_st == INPUTS_MISSING
        and fcf_st == INPUTS_MISSING
        and note_fcf is not None
    ):
        out.append(
            {
                "code": "fcf_without_capex",
                "message": sanitize_display_text(
                    "Note FCF is not in the pack (capex missing)."
                ),
            }
        )
    return [row for row in out if row.get("message")]


def attach_report_meta(sections: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
    """Stamp filer_type / coverage / integrity_warnings on a new sections dict only."""
    out = dict(sections)
    filer = filer_type_from_ctx(ctx)
    if filer:
        out["filer_type"] = filer
    label = coverage_label(ctx)
    if label:
        out["coverage"] = label
    machine = machine_from_sections(out)
    warnings = integrity_warnings(machine, ctx)
    if warnings:
        out["integrity_warnings"] = warnings
    return out


def _pack_close(ctx: dict[str, Any]) -> float | None:
    derived = ctx.get("derived")
    if isinstance(derived, dict):
        n = _finite(derived.get("close"))
        if n is not None:
            return n
    for row in ctx.get("evidence") or []:
        if not isinstance(row, dict):
            continue
        try:
            n = int(row.get("step0_number") or 0)
        except (TypeError, ValueError):
            continue
        if n != 1:
            continue
        return _finite(excerpt_payload(row.get("excerpt")).get("close"))
    return None


def _pack_roic(ctx: dict[str, Any]) -> float | None:
    derived = ctx.get("derived")
    if isinstance(derived, dict):
        series = derived.get("roic_by_year")
        if isinstance(series, list) and series:
            latest = None
            latest_fy = None
            for row in series:
                if not isinstance(row, dict):
                    continue
                try:
                    fy = int(row.get("fy"))
                except (TypeError, ValueError):
                    continue
                val = _finite(row.get("value"))
                if val is None:
                    continue
                if latest_fy is None or fy >= latest_fy:
                    latest_fy = fy
                    latest = val
            if latest is not None:
                return latest
    facts = ctx.get("fundamentals_annual")
    if isinstance(facts, dict):
        years = facts.get("years")
        if isinstance(years, list):
            for row in years:
                if isinstance(row, dict):
                    n = _finite(row.get("roic"))
                    if n is not None:
                        return n
    return None


def _note_roic(machine: dict[str, Any]) -> float | None:
    return _first_number(machine, ("roic", "latest_roic", "roic_pct", "current_roic"))


def _price_close(note: float, pack: float) -> bool:
    if round(note, 2) == round(pack, 2):
        return True
    scale = max(abs(pack), abs(note), 1e-9)
    return abs(note - pack) <= max(PRICE_ABS, PRICE_REL * scale)


def _roic_close(note: float, pack: float) -> bool:
    a = _as_ratio(note)
    b = _as_ratio(pack)
    return abs(a - b) <= ROIC_ABS


def _as_ratio(raw: float) -> float:
    return raw / 100.0 if abs(raw) > 1.0 else raw


def _first_number(machine: dict[str, Any], keys: tuple[str, ...]) -> float | None:
    for key in keys:
        n = _finite(machine.get(key))
        if n is not None:
            return n
    return None


def _finite(raw: Any) -> float | None:
    if raw is None or isinstance(raw, bool):
        return None
    if isinstance(raw, str):
        text = raw.replace("$", "").replace(",", "").replace("%", "").strip()
        try:
            n = float(text)
        except ValueError:
            return None
    else:
        try:
            n = float(raw)
        except (TypeError, ValueError):
            return None
    if n != n:
        return None
    return n


def _money(n: float) -> str:
    return f"${n:,.2f}"


def _pct(n: float) -> str:
    ratio = _as_ratio(n)
    return f"{ratio * 100:.1f}%"
