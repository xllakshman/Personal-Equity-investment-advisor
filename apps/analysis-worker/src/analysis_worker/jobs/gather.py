"""Step 0 gather — Yahoo previous close only (D40)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable
from uuid import UUID

from psycopg2.extensions import connection

from thesis_platform.config import Settings
from thesis_platform.http import fetch_yahoo_chart
from thesis_platform.pack import required_step0
from thesis_platform.quotes import get_cached_close, put_cached_close
from thesis_platform.yahoo import PreviousClose, YahooError, yahoo_symbol


FetchClose = Callable[[Settings, str], PreviousClose]


def gather_step0(
    conn: connection,
    settings: Settings,
    request: dict[str, Any],
    *,
    fetch_close: FetchClose | None = None,
) -> PreviousClose:
    ticker = str(request["ticker"])
    exchange = request.get("exchange")
    try:
        symbol = yahoo_symbol(ticker, str(exchange) if exchange else None)
    except YahooError as exc:
        raise YahooError(str(exc)) from exc

    today = datetime.now(timezone.utc).date()
    cur = conn.cursor()
    cached = get_cached_close(cur, symbol, today)
    if cached is None:
        fetcher = fetch_close or (lambda s, sy: fetch_yahoo_chart(s, sy))
        cached = fetcher(settings, symbol)
        # Reuse for later jobs the same UTC day.
        stored = PreviousClose(
            yahoo_symbol=symbol,
            close=cached.close,
            currency=cached.currency,
            quote_date=today,
        )
        put_cached_close(cur, stored)
        cached = stored

    excerpt = json_excerpt(cached)
    cur.execute(
        """
        insert into analysis_evidence (
          request_id, family_id, step0_number, query, source_url, excerpt
        ) values (%s, %s, 1, %s, %s, %s)
        """,
        (
            request["id"],
            request["family_id"],
            f"yahoo previous close {symbol}",
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=5d&interval=1d",
            excerpt,
        ),
    )
    cur.close()

    lenses = _lenses(request.get("lenses"))
    have = {1}
    missing = [n for n in required_step0(lenses) if n not in have]
    if missing:
        raise YahooError(
            "THS-STEP0-001 missing Step 0 numbers "
            + ",".join(str(n) for n in missing)
            + " (no vendor; not invented from the close)"
        )
    return cached


def json_excerpt(quote: PreviousClose) -> str:
    import json

    return json.dumps(
        {
            "close": quote.close,
            "currency": quote.currency,
            "yahoo_symbol": quote.yahoo_symbol,
            "quote_date": str(quote.quote_date),
        }
    )


def ticker_is_held(conn: connection, family_id: UUID | str, ticker: str) -> bool:
    cur = conn.cursor()
    cur.execute(
        """
        select 1 from holdings
         where family_id = %s and ticker = %s
         limit 1
        """,
        (family_id, ticker.upper().strip()),
    )
    ok = cur.fetchone() is not None
    cur.close()
    return ok


def _lenses(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw]
    text = str(raw).strip("{}")
    if not text:
        return []
    return [p.strip() for p in text.split(",") if p.strip()]
