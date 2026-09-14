from datetime import date
from unittest.mock import MagicMock

import pytest

from analysis_worker.jobs.digest import DigestError, iso_week_start, run_weekly_digest


class Cur:
    def __init__(self, *, opt_in: bool = True, model=None, holdings=None, inserted=True):
        self.opt_in = opt_in
        self.model = model or {
            "id": "gpt56m",
            "thesis_class": "quick",
            "is_refine_gate": True,
        }
        self.holdings = holdings or [
            {"ticker": "MSFT", "qty": 10, "cost_per_share": 300, "native_currency": "USD"},
            {"ticker": "AAPL", "qty": 1, "cost_per_share": 10, "native_currency": "USD"},
            {"ticker": "NVDA", "qty": 2, "cost_per_share": 100, "native_currency": "USD"},
            {"ticker": "GOOG", "qty": 1, "cost_per_share": 5, "native_currency": "USD"},
            {"ticker": "AMZN", "qty": 1, "cost_per_share": 1, "native_currency": "USD"},
        ]
        self.inserted = inserted
        self.sql = ""
        self.calls: list[str] = []

    def execute(self, sql, params=None):
        self.sql = sql
        self.calls.append(sql.lower())

    def fetchone(self):
        sql = self.sql.lower()
        if "weekly_digest_opt_in" in sql:
            return {
                "weekly_digest_opt_in": self.opt_in,
                "weekly_digest_ticker_limit": 3,
                "slug": "professional",
            }
        if "from model_catalog" in sql:
            return self.model
        if "returning id" in sql:
            return {"id": "wd1"} if self.inserted else None
        return None

    def fetchall(self):
        return self.holdings

    def close(self):
        return None


class Conn:
    def __init__(self, cur: Cur):
        self._cur = cur

    def cursor(self, **kwargs):
        return self._cur


def test_opt_in_false_inserts_nothing() -> None:
    cur = Cur(opt_in=False)
    out = run_weekly_digest(Conn(cur), MagicMock(), "fam", date(2026, 9, 14))
    assert out["skipped"] is True
    assert not any("insert into weekly_digests" in c for c in cur.calls)


def test_caps_three_largest_and_records_weekly_kind() -> None:
    cur = Cur()
    out = run_weekly_digest(Conn(cur), MagicMock(), "fam", date(2026, 9, 14))
    assert out["skipped"] is False
    assert out["tickers"] == ["MSFT", "NVDA", "AAPL"]
    assert any("weekly_digest" in c for c in cur.calls)


def test_frontier_model_fails_without_digest_row() -> None:
    cur = Cur(model={"id": "opus5", "thesis_class": "frontier", "is_refine_gate": False})
    with pytest.raises(DigestError):
        run_weekly_digest(
            Conn(cur), MagicMock(), "fam", date(2026, 9, 14), force_model_id="opus5"
        )
    assert not any("insert into weekly_digests" in c for c in cur.calls)


def test_idempotent_conflict() -> None:
    cur = Cur(inserted=False)
    out = run_weekly_digest(Conn(cur), MagicMock(), "fam", date(2026, 9, 14))
    assert out["reason"] == "already_exists"


def test_iso_week_start_monday() -> None:
    assert iso_week_start(date(2026, 9, 14)).weekday() == 0
