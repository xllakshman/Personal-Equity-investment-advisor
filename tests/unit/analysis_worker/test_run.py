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
    anthropic_api_key="sk-ant-test",
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
        conn.rollback.assert_called()


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


def test_unheld_ticker_still_gathers() -> None:
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
        patch("analysis_worker.jobs.run.gather_step0") as gather,
        patch("analysis_worker.jobs.run.complete_request", return_value="r1") as complete,
        patch("analysis_worker.jobs.run.attach_pdf"),
        patch("analysis_worker.jobs.run.set_status"),
        patch("analysis_worker.jobs.run.mark_failed") as failed,
    ):
        process_one(conn, SETTINGS)
        gather.assert_called_once()
        complete.assert_called_once()
        failed.assert_not_called()


def test_keyerror_persists_real_message_not_generic_worker_error() -> None:
    """RealDictCursor KeyError: 1 used to become error_text='worker error'."""
    conn = MagicMock()
    request = {
        "id": "aaaaaaaa-1111-4111-8111-111111111111",
        "family_id": "f1",
        "ticker": "META",
        "lenses": ["fundamental", "technical"],
        "model_id": "haiku45",
        "created_by": "u1",
    }
    with (
        patch("analysis_worker.jobs.run.claim_queued", return_value=request),
        patch("analysis_worker.jobs.run.gather_step0"),
        patch(
            "analysis_worker.jobs.run.complete_request",
            side_effect=KeyError(1),
        ),
        patch("analysis_worker.jobs.run.mark_failed") as failed,
        patch("analysis_worker.jobs.run.set_status"),
    ):
        out = process_one(conn, SETTINGS)
    assert out is not None
    assert "error" in out
    failed.assert_called_once()
    persisted = failed.call_args[0][2]
    assert persisted != "worker error"
    assert "KeyError" in persisted
    conn.rollback.assert_called()
