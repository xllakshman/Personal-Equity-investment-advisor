"""Static checks for migration 013 analysis_feedback."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/013_analysis_feedback.sql").read_text(encoding="utf-8")


def test_013_feedback_table_and_rpc() -> None:
    assert "create table analysis_feedback" in SQL
    assert "report_id       uuid not null unique" in SQL
    assert "helpful         boolean not null" in SQL
    assert "dim_evidence" in SQL
    assert "dim_personal_fit" in SQL
    assert "thesis_submit_analysis_feedback" in SQL
    assert "is_library_sample" in SQL
    assert "revoke update, delete on analysis_feedback" in SQL
    assert "user_can_write_family" in SQL
    assert "sections" not in SQL.split("create table analysis_feedback")[1].split("create or replace function")[0]
    assert "prompt" not in SQL.lower().split("create table analysis_feedback")[1][:800]
