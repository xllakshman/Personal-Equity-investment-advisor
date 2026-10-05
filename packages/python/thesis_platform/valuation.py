"""Forward valuation without licensed consensus (P11-16).

guidance_pe from 8-K Exhibit 99.1 + worker JSON extract.
trailing_pe_vs_history from close / TTM diluted EPS + Yahoo year-end closes.
consensus_forward_pe is always NOT_COVERED. Never scrape analyst feeds.
"""
from __future__ import annotations

import json
import re
from datetime import date
from typing import Any

from thesis_platform.derived import excerpt_payload
from thesis_platform.status import (
    FOUND,
    INPUTS_MISSING,
    NOT_COVERED,
    NOT_DISCLOSED,
    SOURCE_ERROR,
    is_found,
    normalize_status,
)
from thesis_platform.yahoo import DailyClose, close_on_or_before, is_us_listed

GUIDANCE_EXTRACT_SYSTEM = (
    "Extract EPS guidance from an SEC 8-K Exhibit 99.1 earnings release. "
    "Reply with JSON only, no markdown fences: "
    '{"low": number or null, "high": number or null, "basis": "GAAP" or "non-GAAP", '
    '"fiscal_year": number or null, "source_accession": string, "quote": string}. '
    "quote must be a verbatim snippet from the exhibit that contains both EPS numbers. "
    "Use only the company's own EPS guidance range. "
    "If the filing does not state EPS guidance, set low and high to null and quote to \"\". "
    "Never use analyst, consensus, Yahoo, or any number that is not in the exhibit text. "
    "Never write the words Forward P/E."
)

EPS_ABS_MAX = 1000.0
FY_MIN = 1990
FY_MAX = 2100
REVERSE_DISCOUNTS = (0.09, 0.10)
REVERSE_EXIT_PE = (20.0, 25.0)
HISTORY_YEARS = 5
_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.I | re.M)
_NUM_IN_TEXT = re.compile(r"-?\d{1,3}(?:,\d{3})*(?:\.\d+)?")


def consensus_forward_pe() -> dict[str, Any]:
    return {
        "status": NOT_COVERED,
        "reason": "no licensed source configured",
    }


def empty_guidance(status: str = NOT_COVERED) -> dict[str, Any]:
    return {
        "status": status,
        "label": None,
        "pe": None,
        "eps_low": None,
        "eps_high": None,
        "eps_mid": None,
        "basis": None,
        "fiscal_year": None,
        "source_accession": None,
        "quote": None,
    }


def empty_trailing(status: str = NOT_COVERED) -> dict[str, Any]:
    return {
        "status": status,
        "current_pe": None,
        "ttm_diluted_eps": None,
        "five_year_avg": None,
        "premium_pct": None,
        "years": [],
    }


def empty_reverse_dcf(status: str = INPUTS_MISSING) -> dict[str, Any]:
    return {"status": status, "used": None, "eps_mid": None, "label": None, "rows": []}


def exhibit_from_evidence(evidence: list[Any] | None) -> dict[str, Any]:
    for row in evidence or []:
        if not isinstance(row, dict):
            continue
        query = str(row.get("query") or "").lower()
        if "exhibit" not in query and "8k exhibit" not in query:
            if "99.1" not in query:
                continue
        payload = excerpt_payload(row.get("excerpt"))
        if payload:
            return payload
    return {}


def fy_closes_from_evidence(evidence: list[Any] | None) -> list[dict[str, Any]]:
    for row in evidence or []:
        if not isinstance(row, dict):
            continue
        try:
            step = int(row.get("step0_number") or 0)
        except (TypeError, ValueError):
            continue
        if step != 1:
            continue
        payload = excerpt_payload(row.get("excerpt"))
        raw = payload.get("fy_closes")
        if isinstance(raw, list):
            return [item for item in raw if isinstance(item, dict)]
    return []


def extract_guidance_user(exhibit: dict[str, Any]) -> str:
    accession = str(exhibit.get("accession") or exhibit.get("source_accession") or "")
    text = str(exhibit.get("text") or "")[:60000]
    return (
        f"source_accession={accession}\n"
        "Extract EPS guidance JSON from this Exhibit 99.1 text.\n\n"
        f"{text}"
    )


def parse_guidance_json(raw: str) -> dict[str, Any] | None:
    text = _FENCE.sub("", (raw or "").strip()).strip()
    if not text:
        return None
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            return None
        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None
    if not isinstance(data, dict):
        return None
    low = _finite(data.get("low"))
    high = _finite(data.get("high"))
    if low is None or high is None:
        return None
    if low > high:
        return None
    if abs(low) > EPS_ABS_MAX or abs(high) > EPS_ABS_MAX:
        return None
    basis = _basis(data.get("basis"))
    if basis is None:
        return None
    year = _fiscal_year(data.get("fiscal_year"))
    if year is None:
        return None
    quote = str(data.get("quote") or "").strip()
    if not quote:
        return None
    if not quote_contains_both(quote, low, high):
        return None
    return {
        "low": low,
        "high": high,
        "basis": basis,
        "fiscal_year": year,
        "quote": quote[:500],
        "source_accession": str(data.get("source_accession") or "")[:40],
    }


def quote_contains_both(quote: str, low: float, high: float) -> bool:
    if _same_amount(low, high):
        return _quote_has_amount(quote, low)
    return _quote_has_amount(quote, low) and _quote_has_amount(quote, high)


def guidance_label(basis: str, fiscal_year: int) -> str:
    return f"Guidance P/E ({basis} FY{fiscal_year})"


def apply_guidance_extraction(
    raw: str,
    exhibit: dict[str, Any],
    close: float | None,
) -> dict[str, Any]:
    parsed = parse_guidance_json(raw)
    if parsed is None:
        return empty_guidance(NOT_DISCLOSED)
    accession = str(
        exhibit.get("accession") or exhibit.get("source_accession") or parsed["source_accession"]
    )
    mid = round((parsed["low"] + parsed["high"]) / 2.0, 6)
    pe = None
    status = FOUND
    if close is None or close <= 0 or mid <= 0:
        status = INPUTS_MISSING
    else:
        pe = round(close / mid, 4)
    label = guidance_label(parsed["basis"], parsed["fiscal_year"])
    assert "Forward P/E" not in label
    return {
        "status": status,
        "label": label,
        "pe": pe,
        "eps_low": parsed["low"],
        "eps_high": parsed["high"],
        "eps_mid": mid,
        "basis": parsed["basis"],
        "fiscal_year": parsed["fiscal_year"],
        "source_accession": accession or None,
        "quote": parsed["quote"],
    }


def trailing_pe_vs_history(
    *,
    close: float | None,
    fundamentals: dict[str, Any] | None,
    fy_closes: list[dict[str, Any]] | None,
    us_listed: bool,
) -> dict[str, Any]:
    if not us_listed:
        return empty_trailing(NOT_COVERED)
    facts = fundamentals if isinstance(fundamentals, dict) else {}
    facts_st = normalize_status(facts.get("status"))
    if facts_st == SOURCE_ERROR:
        return empty_trailing(SOURCE_ERROR)
    if facts_st == NOT_COVERED:
        return empty_trailing(NOT_COVERED)
    ttm = _finite(facts.get("ttm_diluted_eps"))
    if close is None or close <= 0 or ttm is None or ttm <= 0:
        out = empty_trailing(INPUTS_MISSING)
        out["ttm_diluted_eps"] = ttm
        out["years"] = _history_years(facts, fy_closes)
        return out
    current = round(close / ttm, 4)
    years = _history_years(facts, fy_closes)[:HISTORY_YEARS]
    pes = [row["pe"] for row in years if _finite(row.get("pe")) is not None]
    avg = round(sum(pes) / len(pes), 4) if pes else None
    premium = None
    if avg is not None and avg != 0:
        premium = round(100.0 * (current - avg) / avg, 2)
    return {
        "status": FOUND,
        "current_pe": current,
        "ttm_diluted_eps": ttm,
        "five_year_avg": avg,
        "premium_pct": premium,
        "years": years,
    }


def reverse_dcf_from_guidance(guidance: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(guidance, dict):
        return empty_reverse_dcf(INPUTS_MISSING)
    if not is_found(guidance.get("status")) and normalize_status(guidance.get("status")) != INPUTS_MISSING:
        return empty_reverse_dcf(INPUTS_MISSING)
    mid = _finite(guidance.get("eps_mid"))
    if mid is None or mid <= 0:
        return empty_reverse_dcf(INPUTS_MISSING)
    label = str(guidance.get("label") or "")
    rows = []
    for discount in REVERSE_DISCOUNTS:
        for exit_pe in REVERSE_EXIT_PE:
            rows.append(
                {
                    "discount": discount,
                    "exit_pe": exit_pe,
                    "value": round(mid * exit_pe / (1.0 + discount), 4),
                }
            )
    return {
        "status": FOUND,
        "used": "guidance_pe",
        "eps_mid": mid,
        "label": label or None,
        "rows": rows,
    }


def pick_q5(guidance: dict[str, Any], trailing: dict[str, Any]) -> str | None:
    if is_found(guidance.get("status")) and _finite(guidance.get("pe")) is not None:
        return "guidance_pe"
    if is_found(trailing.get("status")) and _finite(trailing.get("current_pe")) is not None:
        return "trailing_pe_vs_history"
    return None


def valuation_from_ctx(ctx: dict[str, Any]) -> dict[str, Any]:
    ticker = str(ctx.get("ticker") or "")
    exchange = str(ctx.get("exchange") or "") if ctx.get("exchange") is not None else None
    us = is_us_listed(ticker, exchange)
    derived = ctx.get("derived") if isinstance(ctx.get("derived"), dict) else {}
    close = _finite(derived.get("close"))
    facts = ctx.get("fundamentals_annual") if isinstance(ctx.get("fundamentals_annual"), dict) else {}
    fy_closes = fy_closes_from_evidence(ctx.get("evidence") if isinstance(ctx.get("evidence"), list) else [])
    trailing = trailing_pe_vs_history(
        close=close, fundamentals=facts, fy_closes=fy_closes, us_listed=us
    )
    exhibit = exhibit_from_evidence(ctx.get("evidence") if isinstance(ctx.get("evidence"), list) else [])
    if not us:
        guidance = empty_guidance(NOT_COVERED)
    else:
        st = normalize_status(exhibit.get("status"))
        if st == SOURCE_ERROR:
            guidance = empty_guidance(SOURCE_ERROR)
        elif st == NOT_COVERED:
            guidance = empty_guidance(NOT_COVERED)
        else:
            guidance = empty_guidance(NOT_DISCLOSED)
    reverse = reverse_dcf_from_guidance(guidance)
    return {
        "guidance_pe": guidance,
        "trailing_pe_vs_history": trailing,
        "consensus_forward_pe": consensus_forward_pe(),
        "reverse_dcf": reverse,
        "q5_valuation": pick_q5(guidance, trailing),
    }


def fy_end_closes(daily: list[DailyClose] | tuple[DailyClose, ...], years: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for raw in years:
        if not isinstance(raw, dict):
            continue
        try:
            fy = int(raw.get("fy"))
        except (TypeError, ValueError):
            continue
        end_raw = str(raw.get("period_end") or f"{fy}-12-31")[:10]
        try:
            end = date.fromisoformat(end_raw)
        except ValueError:
            continue
        price = close_on_or_before(daily, end)
        if price is None:
            continue
        out.append({"fy": fy, "end": end_raw, "close": price})
    return out


def _history_years(
    facts: dict[str, Any],
    fy_closes: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    closes: dict[int, float] = {}
    for row in fy_closes or []:
        try:
            fy = int(row.get("fy"))
        except (TypeError, ValueError):
            continue
        price = _finite(row.get("close"))
        if price is not None and price > 0:
            closes[fy] = price
    years_raw = facts.get("years") if isinstance(facts.get("years"), list) else []
    rows: list[dict[str, Any]] = []
    for raw in years_raw:
        if not isinstance(raw, dict):
            continue
        try:
            fy = int(raw.get("fy"))
        except (TypeError, ValueError):
            continue
        eps = _finite(raw.get("eps_diluted"))
        price = closes.get(fy)
        if eps is None or eps <= 0 or price is None or price <= 0:
            continue
        rows.append(
            {
                "fy": fy,
                "eps": eps,
                "year_end_close": price,
                "pe": round(price / eps, 4),
            }
        )
    rows.sort(key=lambda item: int(item["fy"]), reverse=True)
    return rows[:HISTORY_YEARS]


def _basis(raw: Any) -> str | None:
    text = str(raw or "").strip().lower().replace("_", " ").replace("-", " ")
    text = " ".join(text.split())
    if text in {"gaap"}:
        return "GAAP"
    if text in {"non gaap", "nongaap", "non gaap eps"}:
        return "non-GAAP"
    return None


def _fiscal_year(raw: Any) -> int | None:
    try:
        year = int(raw)
    except (TypeError, ValueError):
        return None
    if year < FY_MIN or year > FY_MAX:
        return None
    return year


def _quote_has_amount(quote: str, value: float) -> bool:
    if not quote:
        return False
    for match in _NUM_IN_TEXT.findall(quote):
        n = _finite(match.replace(",", ""))
        if n is not None and _same_amount(n, value):
            return True
    compact = quote.replace(",", "").replace("$", "")
    for form in (f"{value:g}", f"{value:.2f}", f"{value:.4f}".rstrip("0").rstrip(".")):
        if form and form in compact:
            return True
    return False


def _same_amount(a: float, b: float) -> bool:
    return abs(a - b) <= max(0.005, abs(b) * 0.001)


def _finite(raw: Any) -> float | None:
    if raw is None or isinstance(raw, bool):
        return None
    if isinstance(raw, str):
        text = raw.replace("$", "").replace(",", "").strip()
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
