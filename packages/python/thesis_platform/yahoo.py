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


def is_us_listed(ticker: str, exchange: str | None) -> bool:
    """US venues only. NSE/BSE (.NS/.BO) are not EDGAR-covered."""
    t = (ticker or "").strip().upper()
    if t.endswith(".NS") or t.endswith(".BO"):
        return False
    ex = (exchange or "").strip().upper()
    if ex in NSE_EXCHANGES or ex in BSE_EXCHANGES:
        return False
    if not ex or ex in US_EXCHANGES:
        return True
    return False


def chart_url(symbol: str, range: str = "1y") -> str:
    window = (range or "1y").strip() or "1y"
    return YAHOO_CHART.format(symbol=symbol) + f"?range={window}&interval=1d"


@dataclass(frozen=True)
class PreviousClose:
    yahoo_symbol: str
    close: float
    currency: str
    quote_date: date


@dataclass(frozen=True)
class DailyClose:
    quote_date: date
    close: float


@dataclass(frozen=True)
class YahooChartPack:
    previous: PreviousClose
    high_52w: float
    high_52w_date: date
    daily_closes: tuple[DailyClose, ...]


def _daily_pairs(payload: dict[str, Any]) -> tuple[str, list[tuple[int, float]]]:
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
    return currency, pairs


def parse_previous_close(payload: dict[str, Any], symbol: str) -> PreviousClose:
    currency, pairs = _daily_pairs(payload)
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


def parse_yahoo_chart_pack(payload: dict[str, Any], symbol: str) -> YahooChartPack:
    """Previous close plus 52-week *closing* high (max daily close, not intra-day)."""
    previous = parse_previous_close(payload, symbol)
    _currency, pairs = _daily_pairs(payload)
    daily: list[DailyClose] = []
    high_price = previous.close
    high_date = previous.quote_date
    for ts, price in pairs:
        day = (
            datetime.fromtimestamp(ts, tz=timezone.utc).date()
            if ts
            else previous.quote_date
        )
        daily.append(DailyClose(quote_date=day, close=price))
        if price > high_price:
            high_price = price
            high_date = day
    return YahooChartPack(
        previous=previous,
        high_52w=high_price,
        high_52w_date=high_date,
        daily_closes=tuple(daily),
    )


def monthly_closes(daily: tuple[DailyClose, ...] | list[DailyClose]) -> list[DailyClose]:
    """Last finished close in each calendar month. For charts, not lots."""
    by_month: dict[str, DailyClose] = {}
    for point in daily:
        key = point.quote_date.isoformat()[:7]
        by_month[key] = point
    return [by_month[k] for k in sorted(by_month)]


def close_on_or_before(
    daily: tuple[DailyClose, ...] | list[DailyClose],
    day: date,
) -> float | None:
    """Last Yahoo close on or before `day`. Do not invent a print."""
    last: float | None = None
    for point in daily:
        if point.quote_date <= day and point.close == point.close and point.close > 0:
            last = point.close
    return last
