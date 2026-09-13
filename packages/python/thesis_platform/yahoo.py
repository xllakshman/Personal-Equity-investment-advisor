"""Yahoo chart v8 previous regular-session close (D40). No API key."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any

YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

US_EXCHANGES = frozenset(
    {"NASDAQ", "NYSE", "AMEX", "ARCA", "BATS", "US", "NYSEARCA", "NYSEAMERICAN"}
)
NSE_EXCHANGES = frozenset({"NSE", "NS", "NATIONAL STOCK EXCHANGE"})
BSE_EXCHANGES = frozenset({"BSE", "BO", "BOMBAY", "BOMBAY STOCK EXCHANGE"})


class YahooError(ValueError):
    """Empty, non-200, or unusable chart payload. Do not estimate a close."""


def yahoo_symbol(ticker: str, exchange: str | None) -> str:
    t = (ticker or "").strip().upper()
    if not t:
        raise YahooError("unknown exchange")
    ex = (exchange or "").strip().upper()
    if not ex or ex in US_EXCHANGES:
        return t.replace(".", "-")
    if ex in NSE_EXCHANGES:
        return f"{t.replace('.', '-')}.NS"
    if ex in BSE_EXCHANGES:
        return f"{t.replace('.', '-')}.BO"
    raise YahooError("unknown exchange")


def chart_url(symbol: str) -> str:
    return YAHOO_CHART.format(symbol=symbol) + "?range=5d&interval=1d"


@dataclass(frozen=True)
class PreviousClose:
    yahoo_symbol: str
    close: float
    currency: str
    quote_date: date


def parse_previous_close(payload: dict[str, Any], symbol: str) -> PreviousClose:
    chart = payload.get("chart") if isinstance(payload, dict) else None
    if not isinstance(chart, dict):
        raise YahooError("empty yahoo chart")
    result = chart.get("result")
    if not result or not isinstance(result, list):
        raise YahooError("empty yahoo chart")
    row = result[0] if result else None
    if not isinstance(row, dict):
        raise YahooError("empty yahoo chart")
    meta = row.get("meta") if isinstance(row.get("meta"), dict) else {}
    currency = str(meta.get("currency") or "USD")[:3].upper() or "USD"
    timestamps = row.get("timestamp") or []
    indicators = row.get("indicators") if isinstance(row.get("indicators"), dict) else {}
    quotes = indicators.get("quote") or []
    closes = []
    if quotes and isinstance(quotes[0], dict):
        closes = quotes[0].get("close") or []
    pairs: list[tuple[int, float]] = []
    for i, raw in enumerate(closes):
        if raw is None:
            continue
        try:
            price = float(raw)
        except (TypeError, ValueError) as exc:
            raise YahooError("close missing") from exc
        if price != price:  # NaN
            continue
        ts = int(timestamps[i]) if i < len(timestamps) and timestamps[i] is not None else 0
        pairs.append((ts, price))
    if not pairs:
        raise YahooError("close missing")
    ts, price = pairs[-1]
    quote_date = (
        datetime.fromtimestamp(ts, tz=timezone.utc).date()
        if ts
        else datetime.now(timezone.utc).date()
    )
    return PreviousClose(
        yahoo_symbol=symbol,
        close=price,
        currency=currency,
        quote_date=quote_date,
    )
