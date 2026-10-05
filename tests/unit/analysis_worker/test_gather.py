"""Gather fails closed on missing close; EDGAR is optional; no inventing 3–7."""
from __future__ import annotations

from datetime import date
from unittest.mock import MagicMock

import pytest

from analysis_worker.jobs.gather import gather_step0
from thesis_platform.config import Settings
from thesis_platform.yahoo import PreviousClose, YahooError

SETTINGS = Settings(
    supabase_url="https://example.supabase.co",
    supabase_db_host="db.example.supabase.co",
    supabase_db_password="x",
)


def _conn() -> MagicMock:
    conn = MagicMock()
    cur = MagicMock()
    cur.fetchone.return_value = None
    conn.cursor.return_value = cur
    return conn


def _evidence_calls(conn: MagicMock) -> list:
    return [
        c
        for c in conn.cursor.return_value.execute.call_args_list
        if c[0] and "analysis_evidence" in str(c[0][0])
    ]


def test_stores_close_not_lot_cost() -> None:
    conn = _conn()
    quote = PreviousClose("MSFT", 412.5, "USD", date(2026, 9, 13))

    def fetch(_s, symbol: str) -> PreviousClose:
        assert symbol == "MSFT"
        return quote

    request = {
        "id": "r1",
        "family_id": "f1",
        "ticker": "MSFT",
        "exchange": "NASDAQ",
        "lenses": ["fundamental", "technical"],
    }
    out = gather_step0(conn, SETTINGS, request, fetch_close=fetch)
    assert out.close == 412.5
    evidence_call = next(
        c
        for c in conn.cursor.return_value.execute.call_args_list
        if c[0] and "analysis_evidence" in str(c[0][0])
    )
    excerpt = evidence_call[0][1][4]
    assert "412.5" in excerpt
    assert "402.5" not in excerpt
    assert "high_52w" in excerpt
    sql = str(conn.cursor.return_value.execute.call_args_list)
    assert "holding_lots" not in sql


def test_comprehensive_does_not_fail_for_missing_items_3_to_7() -> None:
    conn = _conn()
    quote = PreviousClose("MSFT", 412.5, "USD", date(2026, 9, 13))
    request = {
        "id": "r1",
        "family_id": "f1",
        "ticker": "MSFT",
        "exchange": "NASDAQ",
        "lenses": ["fundamental", "technical", "macro", "news"],
    }
    out = gather_step0(conn, SETTINGS, request, fetch_close=lambda *_: quote)
    assert out.close == 412.5
    assert len(_evidence_calls(conn)) == 1


def test_us_edgar_inserts_step2_headlines_only() -> None:
    conn = _conn()
    quote = PreviousClose("MSFT", 412.5, "USD", date(2026, 9, 13))
    headlines = {
        "status": "ok",
        "filings": [
            {
                "form": "8-K",
                "title": "Results of operations",
                "filed": "2026-09-01",
                "url": "https://www.sec.gov/Archives/edgar/data/789019/000/msft.htm",
                "summary": "Results of operations",
            }
        ],
    }
    gather_step0(
        conn,
        SETTINGS,
        {
            "id": "r1",
            "family_id": "f1",
            "ticker": "MSFT",
            "exchange": "NASDAQ",
            "lenses": ["fundamental", "technical", "macro", "news"],
        },
        fetch_close=lambda *_: quote,
        fetch_edgar=lambda *_: headlines,
    )
    calls = _evidence_calls(conn)
    assert len(calls) == 2
    item2 = calls[1][0][0]
    assert "step0_number" in item2
    excerpt = calls[1][0][1][4]
    assert "8-K" in excerpt
    assert "Results of operations" in excerpt
    assert "<html" not in excerpt.lower()


def test_us_edgar_timeout_stores_source_error_not_absence() -> None:
    conn = _conn()
    quote = PreviousClose("MSFT", 412.5, "USD", date(2026, 9, 13))
    gather_step0(
        conn,
        SETTINGS,
        {
            "id": "r1",
            "family_id": "f1",
            "ticker": "MSFT",
            "exchange": "NASDAQ",
            "lenses": ["fundamental"],
        },
        fetch_close=lambda *_: quote,
        fetch_edgar=lambda *_: {"status": "SOURCE_ERROR", "filings": []},
    )
    calls = _evidence_calls(conn)
    assert len(calls) == 2
    excerpt = calls[1][0][1][4]
    assert "SOURCE_ERROR" in excerpt
    assert "NOT_COVERED" not in excerpt
    assert "no news" not in excerpt.lower()


def test_nse_skips_edgar_row() -> None:
    conn = _conn()
    quote = PreviousClose("HDFCBANK.NS", 1500.0, "INR", date(2026, 9, 13))
    called = {"edgar": False}

    def edgar(*_a):
        called["edgar"] = True
        return {
            "status": "ok",
            "filings": [{"form": "8-K", "title": "x", "filed": "2026-01-01", "url": "u", "summary": "x"}],
        }

    gather_step0(
        conn,
        SETTINGS,
        {
            "id": "r1",
            "family_id": "f1",
            "ticker": "HDFCBANK",
            "exchange": "NSE",
            "lenses": ["fundamental", "technical", "macro", "news"],
        },
        fetch_close=lambda *_: quote,
        fetch_edgar=edgar,
    )
    assert called["edgar"] is False
    assert len(_evidence_calls(conn)) == 1
    assert "NOT_DISCLOSED" not in str(conn.cursor.return_value.execute.call_args_list)


def test_us_companyfacts_inserts_citation_without_lots() -> None:
    conn = _conn()
    quote = PreviousClose("MSFT", 412.5, "USD", date(2026, 9, 13))
    facts = {
        "status": "ok",
        "cik": "0000789019",
        "entity": "Microsoft",
        "concepts_used": {"revenue": "Revenues"},
        "years": [{"fy": 2024, "revenue": 100, "fcf": 30, "roic": None}],
    }
    facts_called = {"n": 0}

    def fetch_facts(*_a):
        facts_called["n"] += 1
        return facts

    gather_step0(
        conn,
        SETTINGS,
        {
            "id": "r1",
            "family_id": "f1",
            "ticker": "MSFT",
            "exchange": "NASDAQ",
            "lenses": ["fundamental"],
        },
        fetch_close=lambda *_: quote,
        fetch_facts=fetch_facts,
    )
    assert facts_called["n"] == 1
    calls = _evidence_calls(conn)
    assert len(calls) == 2
    query = calls[1][0][1][2]
    excerpt = calls[1][0][1][4]
    assert "companyfacts" in query
    assert "2024" in excerpt
    assert "holding_lots" not in str(conn.cursor.return_value.execute.call_args_list)
    assert "stockanalysis.com" not in str(conn.cursor.return_value.execute.call_args_list)


def test_nse_does_not_call_companyfacts() -> None:
    conn = _conn()
    quote = PreviousClose("HDFCBANK.NS", 1500.0, "INR", date(2026, 9, 13))
    called = {"facts": False}

    def facts(*_a):
        called["facts"] = True
        return {
            "status": "ok",
            "years": [{"fy": 2024, "revenue": 1}],
        }

    gather_step0(
        conn,
        SETTINGS,
        {
            "id": "r1",
            "family_id": "f1",
            "ticker": "HDFCBANK",
            "exchange": "NSE",
            "lenses": ["fundamental"],
        },
        fetch_close=lambda *_: quote,
        fetch_facts=facts,
    )
    assert called["facts"] is False
    assert len(_evidence_calls(conn)) == 1


def test_empty_yahoo_raises() -> None:
    conn = _conn()
    request = {
        "id": "r1",
        "family_id": "f1",
        "ticker": "MSFT",
        "exchange": "NASDAQ",
        "lenses": ["fundamental"],
    }
    with pytest.raises(YahooError):
        gather_step0(
            conn,
            SETTINGS,
            request,
            fetch_close=lambda *_: (_ for _ in ()).throw(YahooError("empty yahoo chart")),
        )
