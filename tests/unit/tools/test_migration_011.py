"""Static checks for Thesis migration 011 (holding gate on accept, no live DB)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/011_accept_holding_check.sql").read_text(encoding="utf-8")
PREV = (ROOT / "supabase/migrations/005_analysis_reports.sql").read_text(encoding="utf-8")


def test_011_rejects_unheld_ticker_before_quota():
    assert "THS-HOLDING-001" in SQL
    hold_at = SQL.index("THS-HOLDING-001")
    quota_at = SQL.index("thesis_assert_quota")
    insert_at = SQL.index("insert into analysis_requests")
    usage_at = SQL.index("insert into usage_events")
    assert hold_at < quota_at < insert_at < usage_at
    assert "from holdings h" in SQL
    assert "h.family_id = v_family" in SQL
    assert "h.ticker = v_ticker" in SQL


def test_011_keeps_conflict_and_quota_codes():
    assert "THS-RISK-001" in SQL
    assert "thesis_risk_cagr_is_conflict" in SQL
    assert "thesis_assert_quota" in SQL
    assert "THS-QUOTA-001" in PREV
    assert "p_invested_currency char(3)" in SQL
    assert "grant execute on function thesis_accept_analysis" in SQL
    assert "to authenticated" in SQL


def test_011_does_not_invent_model_plan_gate():
    assert "THS-MODEL-001" not in SQL
