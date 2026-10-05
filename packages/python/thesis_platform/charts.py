"""System charts from Yahoo-derived numbers. Never model HTML. No pie."""
from __future__ import annotations

from datetime import date
from typing import Any

from thesis_platform.derived import excerpt_payload
from thesis_platform.yahoo import DailyClose, monthly_closes


def system_charts_from_ctx(
    ctx: dict[str, Any],
    derived: dict[str, Any] | None,
) -> dict[str, Any]:
    """Allowlisted line + table for new reports only. Never UPDATE old rows."""
    item1: dict[str, Any] = {}
    for row in ctx.get("evidence") or []:
        if isinstance(row, dict) and int(row.get("step0_number") or 0) == 1:
            item1 = excerpt_payload(row.get("excerpt"))
            break
    charts: dict[str, Any] = {}
    line = price_vs_tranches_chart(item1)
    if line:
        charts["price_vs_tranches"] = line
    table = levels_table(derived or {})
    if table:
        charts["tranche_levels"] = table
    return charts


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
    return {
        "type": "line",
        "title": "Price vs 52-week",
        "labels": [p.quote_date.isoformat() for p in points],
        "values": [p.close for p in points],
        "rows": [],
    }


def levels_table(derived: dict[str, Any]) -> dict[str, Any] | None:
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
    return {
        "type": "table",
        "title": "Derived levels (Yahoo + cost)",
        "labels": [],
        "values": [],
        "rows": [["Level", "Value"], *rows],
    }


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
