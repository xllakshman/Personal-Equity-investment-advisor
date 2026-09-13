"""Gather fails closed; stores close excerpt; no inventing Step 0 2–7."""
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


def test_comprehensive_fails_listing_missing_step0() -> None:
    conn = _conn()
    quote = PreviousClose("MSFT", 412.5, "USD", date(2026, 9, 13))
    request = {
        "id": "r1",
        "family_id": "f1",
        "ticker": "MSFT",
        "exchange": "NASDAQ",
        "lenses": ["fundamental", "technical", "macro", "news"],
    }
    with pytest.raises(YahooError, match="THS-STEP0-001"):
        gather_step0(conn, SETTINGS, request, fetch_close=lambda *_: quote)
    with pytest.raises(YahooError, match="2,3,4,5,6,7"):
        gather_step0(conn, SETTINGS, request, fetch_close=lambda *_: quote)


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
