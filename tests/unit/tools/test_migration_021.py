"""Static checks for Thesis migration 021 (analyse without a holdings row)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/021_analyse_without_holding.sql").read_text(
    encoding="utf-8"
)


def test_021_empty_ticker_before_quota_no_holdings_gate():
    assert "THS-TICKER-001" in SQL
    ticker_at = SQL.index("THS-TICKER-001")
    quota_at = SQL.index("thesis_assert_quota")
    insert_at = SQL.index("insert into analysis_requests")
    usage_at = SQL.index("insert into usage_events")
    assert ticker_at < quota_at < insert_at < usage_at
    assert "from holdings h" not in SQL
    assert "THS-HOLDING-001" not in SQL
    assert "'search'" in SQL
    assert "member_role in ('owner', 'member')" in SQL


def test_021_keeps_conflict_quota_and_intended_investment():
    assert "THS-RISK-001" in SQL
    assert "thesis_assert_quota" in SQL
    assert "p_intended_investment numeric default 0" in SQL
    assert "grant execute on function thesis_accept_analysis" in SQL
    assert "to authenticated" in SQL
    assert "update holding_lots" not in SQL.lower()
