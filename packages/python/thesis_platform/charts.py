"""System charts from Yahoo-derived numbers and fundamentals. Never model HTML. No pie."""
from __future__ import annotations

from datetime import date
from typing import Any

from thesis_platform.derived import excerpt_payload
from thesis_platform.xbrl import derived_from_fundamentals, fundamentals_from_evidence
from thesis_platform.yahoo import DailyClose, monthly_closes

ROIC_REFERENCE_PCT = 15.0
CASH_CONVERSION_REFERENCE_PCT = 80.0
YAHOO_SOURCE = "Yahoo Finance chart v8"
YAHOO_COST_SOURCE = "Yahoo Finance chart v8 + book cost"
SEC_SOURCE = "SEC companyfacts"


def system_charts_from_ctx(
    ctx: dict[str, Any],
    derived: dict[str, Any] | None,
) -> dict[str, Any]:
    """Allowlisted line + table + ROIC/cash bars for new reports only. Never UPDATE old rows."""
    item1: dict[str, Any] = {}
    for row in ctx.get("evidence") or []:
        if isinstance(row, dict) and int(row.get("step0_number") or 0) == 1:
            item1 = excerpt_payload(row.get("excerpt"))
            break
    charts: dict[str, Any] = {}
    as_of = _quote_as_of(item1)
    line = price_vs_tranches_chart(item1)
    if line:
        charts["price_vs_tranches"] = line
    table = levels_table(derived or {}, as_of=as_of)
    if table:
        charts["tranche_levels"] = table
    extras = dict(derived or {})
    if extras.get("roic_years_available") is None:
        facts = ctx.get("fundamentals_annual")
        if not isinstance(facts, dict):
            facts = fundamentals_from_evidence(ctx.get("evidence") or [])
        extras.update(derived_from_fundamentals(facts))
    roic = roic_history_chart(extras)
    if roic:
        charts["roic_history"] = roic
    cash = cash_conversion_chart(extras)
    if cash:
        charts["cash_conversion"] = cash
    return charts


def roic_history_chart(derived: dict[str, Any]) -> dict[str, Any] | None:
    points = _pct_points(derived.get("roic_by_year"))
    if not points:
        return None
    return {
        "type": "bar",
        "title": "ROIC vs 15%",
        "labels": [label for label, _ in points],
        "values": [value for _, value in points],
        "rows": [],
        "reference": ROIC_REFERENCE_PCT,
        "unit": "%",
        "source": SEC_SOURCE,
        "as_of": f"FY {points[-1][0]}",
    }


def cash_conversion_chart(derived: dict[str, Any]) -> dict[str, Any] | None:
    fcf = _ratio_by_fy(derived.get("fcf_ni"))
    ocf = _ratio_by_fy(derived.get("ocf_ni"))
    fys = sorted(set(fcf) | set(ocf))
    if not fys:
        return None
    labels: list[str] = []
    values: list[float] = []
    for fy in fys:
        if fy in fcf:
            labels.append(f"{fy} FCF/NI")
            values.append(round(fcf[fy] * 100, 2))
        if fy in ocf:
            labels.append(f"{fy} OCF/NI")
            values.append(round(ocf[fy] * 100, 2))
    if not labels:
        return None
    return {
        "type": "bar",
        "title": "Cash conversion vs 80%",
        "labels": labels,
        "values": values,
        "rows": [],
        "reference": CASH_CONVERSION_REFERENCE_PCT,
        "unit": "%",
        "source": SEC_SOURCE,
        "as_of": f"FY {fys[-1]}",
    }


def price_vs_tranches_chart(item1: dict[str, Any]) -> dict[str, Any] | None:
    raw = item1.get("monthly_closes")
    if not isinstance(raw, list) or len(raw) < 2:
        daily = _daily_from_excerpt(item1)
        points = monthly_closes(daily) if daily else []
    else:
        points = []
        for row in raw:
            if not isinstance(row, dict):
                continue
            day = str(row.get("date") or "")[:10]
            try:
                close = float(row.get("close"))
            except (TypeError, ValueError):
                continue
            if not day or close != close or close <= 0:
                continue
            points.append(DailyClose(quote_date=date.fromisoformat(day), close=close))
    if len(points) < 2:
        return None
    as_of = _quote_as_of(item1) or points[-1].quote_date.isoformat()
    return {
        "type": "line",
        "title": "Price vs 52-week",
        "labels": [p.quote_date.isoformat() for p in points],
        "values": [p.close for p in points],
        "rows": [],
        "source": YAHOO_SOURCE,
        "as_of": as_of,
    }


def levels_table(derived: dict[str, Any], *, as_of: str | None = None) -> dict[str, Any] | None:
    rows: list[list[str]] = []
    close = derived.get("close")
    high = derived.get("high_52w")
    pct = derived.get("pct_below_52w_high")
    if close is not None:
        rows.append(["Previous close", _num(close)])
    if high is not None:
        rows.append(["52-week closing high", _num(high)])
    if pct is not None:
        rows.append(["% below 52-week high", f"{pct}%"])
    for key, label in (("t2", "T2 (10–15% below high)"), ("t3", "T3 (20–25%)"), ("t4", "T4 (35–40%)")):
        band = derived.get(key)
        if isinstance(band, dict) and band.get("price_low") is not None:
            rows.append(
                [label, f"{_num(band['price_low'])} – {_num(band['price_high'])}"]
            )
    if derived.get("t1") is not None:
        rows.append(["T1 (cost)", _num(derived["t1"])])
    for key, label in (("u1", "U1 (+10–20% from T1)"), ("u2", "U2 (+20–40% from T1)")):
        band = derived.get(key)
        if isinstance(band, dict) and band.get("price_low") is not None:
            rows.append(
                [label, f"{_num(band['price_low'])} – {_num(band['price_high'])}"]
            )
    if not rows:
        return None
    source = YAHOO_COST_SOURCE if derived.get("t1") is not None else YAHOO_SOURCE
    out: dict[str, Any] = {
        "type": "table",
        "title": "Derived levels (Yahoo + cost)",
        "labels": [],
        "values": [],
        "rows": [["Level", "Value"], *rows],
        "source": source,
    }
    if as_of:
        out["as_of"] = as_of
    return out


def _quote_as_of(item1: dict[str, Any]) -> str | None:
    raw = str(item1.get("quote_date") or "").strip()[:10]
    if len(raw) >= 10:
        return raw
    return None


def _pct_points(series: Any) -> list[tuple[str, float]]:
    if not isinstance(series, list):
        return []
    out: list[tuple[str, float]] = []
    for row in series:
        if not isinstance(row, dict):
            continue
        try:
            fy = int(row.get("fy"))
            value = float(row.get("value"))
        except (TypeError, ValueError):
            continue
        if value != value:
            continue
        out.append((str(fy), round(value * 100, 2)))
    return out


def _ratio_by_fy(series: Any) -> dict[int, float]:
    if not isinstance(series, list):
        return {}
    out: dict[int, float] = {}
    for row in series:
        if not isinstance(row, dict):
            continue
        try:
            fy = int(row.get("fy"))
            value = float(row.get("value"))
        except (TypeError, ValueError):
            continue
        if value != value:
            continue
        out[fy] = value
    return out


def _daily_from_excerpt(item1: dict[str, Any]) -> list[DailyClose]:
    raw = item1.get("daily_closes")
    if not isinstance(raw, list):
        return []
    out: list[DailyClose] = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        try:
            day = date.fromisoformat(str(row.get("date") or "")[:10])
            close = float(row.get("close"))
        except (TypeError, ValueError):
            continue
        if close == close and close > 0:
            out.append(DailyClose(quote_date=day, close=close))
    return out


def _num(n: Any) -> str:
    try:
        v = float(n)
    except (TypeError, ValueError):
        return "—"
    if abs(v) >= 100:
        return f"{v:.2f}"
    return f"{v:.4f}".rstrip("0").rstrip(".")
