"""eod_quotes cache helpers (worker DB)."""
from __future__ import annotations

from datetime import date

from psycopg2.extensions import cursor

from .yahoo import PreviousClose


def get_cached_close(cur: cursor, symbol: str, quote_date: date) -> PreviousClose | None:
    cur.execute(
        """
        select yahoo_symbol, quote_date, close, currency
          from eod_quotes
         where yahoo_symbol = %s and quote_date = %s
        """,
        (symbol, quote_date),
    )
    row = cur.fetchone()
    if not row:
        return None
    return PreviousClose(
        yahoo_symbol=str(row[0]),
        quote_date=row[1],
        close=float(row[2]),
        currency=str(row[3]),
    )


def put_cached_close(cur: cursor, quote: PreviousClose) -> None:
    cur.execute(
        """
        insert into eod_quotes (yahoo_symbol, quote_date, close, currency)
        values (%s, %s, %s, %s)
        on conflict (yahoo_symbol, quote_date) do update
          set close = excluded.close,
              currency = excluded.currency,
              retrieved_at = now()
        """,
        (quote.yahoo_symbol, quote.quote_date, quote.close, quote.currency),
    )
