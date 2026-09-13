"""process_one fail-closed without inserting reports on Yahoo miss."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

from analysis_worker.jobs.run import process_one
from thesis_platform.config import Settings
from thesis_platform.yahoo import YahooError

SETTINGS = Settings(
    supabase_url="https://example.supabase.co",
    supabase_db_host="db.example.supabase.co",
    supabase_db_password="x",
    openrouter_api_key="sk-or-test",
)


def test_empty_yahoo_marks_failed() -> None:
    conn = MagicMock()
    request = {
        "id": "aaaaaaaa-1111-4111-8111-111111111111",
        "family_id": "f1",
        "ticker": "MSFT",
        "exchange": "NASDAQ",
        "lenses": ["fundamental"],
        "model_id": "opus5",
        "created_by": "u1",
    }
    with (
        patch("analysis_worker.jobs.run.claim_queued", return_value=request),
        patch("analysis_worker.jobs.run.ticker_is_held", return_value=True),
        patch(
            "analysis_worker.jobs.run.gather_step0",
            side_effect=YahooError("empty yahoo chart"),
        ),
        patch("analysis_worker.jobs.run.mark_failed") as failed,
        patch("analysis_worker.jobs.run.complete_request") as complete,
    ):
        out = process_one(conn, SETTINGS)
        assert out is not None
        assert "error" in out
        failed.assert_called_once()
        complete.assert_not_called()


def test_claim_quota_reject_does_not_complete() -> None:
    conn = MagicMock()
    with (
        patch(
            "analysis_worker.jobs.run.claim_queued",
            side_effect=RuntimeError("THS-QUOTA-002 allowance no longer available"),
        ),
        patch("analysis_worker.jobs.run.complete_request") as complete,
        patch("analysis_worker.jobs.run.mark_failed") as failed,
    ):
        out = process_one(conn, SETTINGS)
        assert out is not None
        assert "THS-QUOTA-002" in str(out.get("error"))
        complete.assert_not_called()
        failed.assert_not_called()


def test_unheld_ticker_does_not_complete() -> None:
    conn = MagicMock()
    request = {
        "id": "aaaaaaaa-1111-4111-8111-111111111111",
        "family_id": "f1",
        "ticker": "ZZZZ",
        "lenses": ["fundamental"],
        "model_id": "opus5",
        "created_by": "u1",
    }
    with (
        patch("analysis_worker.jobs.run.claim_queued", return_value=request),
        patch("analysis_worker.jobs.run.ticker_is_held", return_value=False),
        patch("analysis_worker.jobs.run.complete_request") as complete,
        patch("analysis_worker.jobs.run.mark_failed") as failed,
    ):
        process_one(conn, SETTINGS)
        complete.assert_not_called()
        failed.assert_called_once()
