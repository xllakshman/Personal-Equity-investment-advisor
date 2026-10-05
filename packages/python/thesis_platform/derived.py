"""Price bands from Yahoo 52-week closing high and T1 cost. No fundamentals."""
from __future__ import annotations

import json
from typing import Any

from thesis_platform.status import FOUND, INPUTS_MISSING, NOT_COVERED, SOURCE_ERROR, normalize_status

# Framework 3: T2 10–15% below high, T3 20–25%, T4 35–40%.
T2_DROP = (0.10, 0.15)
T3_DROP = (0.20, 0.25)
T4_DROP = (0.35, 0.40)
# Runaway protocol: U1 +10–20% from T1, U2 +20–40% from T1.
U1_UP = (0.10, 0.20)
U2_UP = (0.20, 0.40)


def pct_below_52w_high(close: float, high_52w: float) -> float | None:
    if not _pos(close) or not _pos(high_52w):
        return None
    return round(100.0 * (high_52w - close) / high_52w, 2)


def drop_band(high_52w: float, drop_lo: float, drop_hi: float) -> dict[str, float] | None:
    """Price band where the stock is drop_lo–drop_hi below the 52w closing high."""
    if not _pos(high_52w):
        return None
    return {
        "price_low": round(high_52w * (1.0 - drop_hi), 4),
        "price_high": round(high_52w * (1.0 - drop_lo), 4),
        "drop_pct_low": drop_lo * 100,
        "drop_pct_high": drop_hi * 100,
    }


def up_band(t1: float, up_lo: float, up_hi: float) -> dict[str, float] | None:
    if not _pos(t1):
        return None
    return {
        "price_low": round(t1 * (1.0 + up_lo), 4),
        "price_high": round(t1 * (1.0 + up_hi), 4),
        "up_pct_low": up_lo * 100,
        "up_pct_high": up_hi * 100,
    }


def derived_levels(
    *,
    close: float | None,
    high_52w: float | None,
    t1_cost: float | None,
) -> dict[str, Any]:
    high = high_52w if _pos(high_52w) else None
    last = close if _pos(close) else None
    t1 = t1_cost if _pos(t1_cost) else None
    return {
        "close": last,
        "high_52w": high,
        "pct_below_52w_high": pct_below_52w_high(last, high) if last and high else None,
        "t2": drop_band(high, *T2_DROP) if high else None,
        "t3": drop_band(high, *T3_DROP) if high else None,
        "t4": drop_band(high, *T4_DROP) if high else None,
        "t1": t1,
        "u1": up_band(t1, *U1_UP) if t1 else None,
        "u2": up_band(t1, *U2_UP) if t1 else None,
    }


def t1_cost_from_ctx(ctx: dict[str, Any]) -> float | None:
    run = _finite(ctx.get("run_cost_per_share"))
    if run and run > 0:
        return run
    ticker = str(ctx.get("ticker") or "").strip().upper()
    if not ticker:
        return None
    for row in ctx.get("holdings") or []:
        if not isinstance(row, dict):
            continue
        if str(row.get("ticker") or "").strip().upper() != ticker:
            continue
        cost = _finite(row.get("cost_per_share"))
        if cost and cost > 0:
            return cost
    return None


def excerpt_payload(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return data if isinstance(data, dict) else {}
    return {}


def derived_from_ctx(ctx: dict[str, Any]) -> dict[str, Any]:
    item1: dict[str, Any] = {}
    for row in ctx.get("evidence") or []:
        if isinstance(row, dict) and int(row.get("step0_number") or 0) == 1:
            item1 = excerpt_payload(row.get("excerpt"))
            break
    close = _finite(item1.get("close"))
    high = _finite(item1.get("high_52w"))
    return derived_levels(close=close, high_52w=high, t1_cost=t1_cost_from_ctx(ctx))


def step0_coverage(evidence: list[Any] | None) -> dict[str, str]:
    item1 = NOT_COVERED
    item2: list[str] = []
    for row in evidence or []:
        if not isinstance(row, dict) or row.get("step0_number") is None:
            continue
        try:
            n = int(row["step0_number"])
        except (TypeError, ValueError):
            continue
        excerpt = excerpt_payload(row.get("excerpt"))
        status = normalize_status(excerpt.get("status"))
        if n == 1:
            item1 = FOUND
        elif n == 2:
            if status:
                item2.append(status)
            else:
                item2.append(FOUND)
    out: dict[str, str] = {"1": item1}
    if FOUND in item2:
        out["2"] = FOUND
    elif SOURCE_ERROR in item2:
        out["2"] = SOURCE_ERROR
    elif INPUTS_MISSING in item2:
        out["2"] = INPUTS_MISSING
    else:
        out["2"] = NOT_COVERED
    for n in range(3, 8):
        out[str(n)] = NOT_COVERED
    return out


def _pos(n: float | None) -> bool:
    return n is not None and n == n and n > 0


def _finite(raw: Any) -> float | None:
    try:
        n = float(raw)
    except (TypeError, ValueError):
        return None
    if n != n:
        return None
    return n
