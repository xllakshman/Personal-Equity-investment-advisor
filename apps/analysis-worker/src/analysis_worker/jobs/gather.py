"""Step 0 gather — Yahoo 1y chart (D40) + SEC EDGAR headlines for US names."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Callable
from uuid import UUID

from psycopg2.extensions import connection

from thesis_platform.config import Settings
from thesis_platform.derived import pct_below_52w_high
from thesis_platform.edgar import NOT_COVERED
from thesis_platform.status import FOUND, INPUTS_MISSING, SOURCE_ERROR, normalize_status
from thesis_platform.http import fetch_edgar_companyfacts, fetch_edgar_headlines, fetch_yahoo_chart_pack
from thesis_platform.xbrl import COMPANYFACTS_URL, empty_fundamentals
from thesis_platform.pack import required_step0
from thesis_platform.quotes import get_cached_close, put_cached_close
from thesis_platform.yahoo import (
    DailyClose,
    PreviousClose,
    YahooChartPack,
    YahooError,
    is_us_listed,
    monthly_closes,
    yahoo_symbol,
)


FetchClose = Callable[[Settings, str], PreviousClose]
FetchChart = Callable[[Settings, str], YahooChartPack]
FetchEdgar = Callable[[Settings, str, str | None], dict[str, Any]]
FetchFacts = Callable[[Settings, str, str | None], dict[str, Any]]


def gather_step0(
    conn: connection,
    settings: Settings,
    request: dict[str, Any],
    *,
    fetch_close: FetchClose | None = None,
    fetch_chart: FetchChart | None = None,
    fetch_edgar: FetchEdgar | None = None,
    fetch_facts: FetchFacts | None = None,
) -> PreviousClose:
    ticker = str(request["ticker"])
    exchange = request.get("exchange")
    try:
        symbol = yahoo_symbol(ticker, str(exchange) if exchange else None)
    except YahooError as exc:
        raise YahooError(str(exc)) from exc

    today = datetime.now(timezone.utc).date()
    cur = conn.cursor()
    pack = _load_chart(
        cur,
        settings,
        symbol,
        today,
        fetch_chart=fetch_chart,
        fetch_close=fetch_close,
    )
    cached = pack.previous

    excerpt = json_excerpt(pack)
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
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1y&interval=1d",
            excerpt,
        ),
    )

    if not is_us_listed(ticker, str(exchange) if exchange else None):
        news = {"status": NOT_COVERED, "filings": []}
    else:
        if fetch_edgar is not None:
            edgar_fn = fetch_edgar
        elif fetch_close is None and fetch_chart is None:
            edgar_fn = lambda s, t, ex: fetch_edgar_headlines(s, t, ex)
        else:
            edgar_fn = lambda _s, _t, _ex: {"status": NOT_COVERED, "filings": []}
        try:
            news = edgar_fn(settings, ticker, str(exchange) if exchange else None)
        except Exception:  # noqa: BLE001 — EDGAR miss must not fail the job
            news = {"status": SOURCE_ERROR, "filings": []}
    _store_item2(
        cur,
        request,
        query=f"sec edgar headlines {ticker}",
        source_url="https://data.sec.gov/submissions/",
        payload=_headlines_excerpt(news),
        store=_should_store_news(news),
    )

    facts: dict[str, Any]
    if not is_us_listed(ticker, str(exchange) if exchange else None):
        facts = empty_fundamentals()
    else:
        if fetch_facts is not None:
            facts_fn = fetch_facts
        elif fetch_close is None and fetch_chart is None:
            facts_fn = lambda s, t, ex: fetch_edgar_companyfacts(s, t, ex)
        else:
            facts_fn = lambda _s, _t, _ex: empty_fundamentals()
        try:
            facts = facts_fn(settings, ticker, str(exchange) if exchange else None)
        except Exception:  # noqa: BLE001 — XBRL miss must not fail the job
            facts = empty_fundamentals(SOURCE_ERROR)
    _store_item2(
        cur,
        request,
        query=f"sec edgar companyfacts {ticker}",
        source_url=_facts_url(facts),
        payload=_facts_excerpt(facts),
        store=_should_store_facts(facts),
    )

    have = {1}
    if _should_store_news(news) and normalize_status(news.get("status")) == FOUND and news.get("filings"):
        have.add(2)
    missing = [n for n in required_step0(_lenses(request.get("lenses"))) if n not in have]
    if missing:
        raise YahooError(
            "THS-STEP0-001 missing Step 0 numbers "
            + ",".join(str(n) for n in missing)
        )
    cur.close()
    return cached


def _load_chart(
    cur,
    settings: Settings,
    symbol: str,
    today,
    *,
    fetch_chart: FetchChart | None,
    fetch_close: FetchClose | None,
) -> YahooChartPack:
    if fetch_chart is not None:
        pack = fetch_chart(settings, symbol)
    elif fetch_close is not None:
        prev = fetch_close(settings, symbol)
        pack = YahooChartPack(
            previous=prev,
            high_52w=prev.close,
            high_52w_date=prev.quote_date,
            daily_closes=(DailyClose(quote_date=prev.quote_date, close=prev.close),),
        )
    else:
        try:
            pack = fetch_yahoo_chart_pack(settings, symbol)
        except YahooError:
            cached = get_cached_close(cur, symbol, today)
            if cached is None:
                raise
            pack = YahooChartPack(
                previous=cached,
                high_52w=cached.close,
                high_52w_date=cached.quote_date,
                daily_closes=(
                    DailyClose(quote_date=cached.quote_date, close=cached.close),
                ),
            )
    stored = PreviousClose(
        yahoo_symbol=symbol,
        close=pack.previous.close,
        currency=pack.previous.currency,
        quote_date=today,
    )
    put_cached_close(cur, stored)
    return YahooChartPack(
        previous=stored,
        high_52w=pack.high_52w,
        high_52w_date=pack.high_52w_date,
        daily_closes=pack.daily_closes,
    )


def json_excerpt(pack: YahooChartPack) -> str:
    prev = pack.previous
    monthly = monthly_closes(pack.daily_closes)
    return json.dumps(
        {
            "close": prev.close,
            "currency": prev.currency,
            "yahoo_symbol": prev.yahoo_symbol,
            "quote_date": str(prev.quote_date),
            "high_52w": pack.high_52w,
            "high_52w_date": str(pack.high_52w_date),
            "pct_below_52w_high": pct_below_52w_high(prev.close, pack.high_52w),
            "monthly_closes": [
                {"date": str(p.quote_date), "close": p.close} for p in monthly
            ],
        }
    )


def _should_store_news(news: Any) -> bool:
    if not isinstance(news, dict):
        return False
    return normalize_status(news.get("status")) in (FOUND, SOURCE_ERROR)


def _should_store_facts(facts: Any) -> bool:
    if not isinstance(facts, dict):
        return False
    return normalize_status(facts.get("status")) in (FOUND, INPUTS_MISSING, SOURCE_ERROR)


def _headlines_excerpt(news: Any) -> dict[str, Any]:
    if not isinstance(news, dict):
        return {"status": SOURCE_ERROR, "filings": []}
    status = normalize_status(news.get("status")) or SOURCE_ERROR
    filings = news.get("filings") if status == FOUND and isinstance(news.get("filings"), list) else []
    out: dict[str, Any] = {"status": status, "filings": filings}
    filer = str(news.get("filer_type") or "").strip()
    if filer:
        out["filer_type"] = filer[:80]
    return out


def _facts_excerpt(facts: Any) -> dict[str, Any]:
    if not isinstance(facts, dict):
        return empty_fundamentals(SOURCE_ERROR)
    return facts


def _facts_url(facts: Any) -> str:
    cik = ""
    if isinstance(facts, dict):
        cik = str(facts.get("cik") or "")
    return COMPANYFACTS_URL.format(cik=cik)


def _store_item2(
    cur,
    request: dict[str, Any],
    *,
    query: str,
    source_url: str,
    payload: dict[str, Any],
    store: bool,
) -> None:
    if not store:
        return
    cur.execute(
        """
        insert into analysis_evidence (
          request_id, family_id, step0_number, query, source_url, excerpt
        ) values (%s, %s, 2, %s, %s, %s)
        """,
        (
            request["id"],
            request["family_id"],
            query,
            source_url,
            json.dumps(payload, default=str),
        ),
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
