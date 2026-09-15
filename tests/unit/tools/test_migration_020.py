"""Static checks for Thesis migration 020 (intended investment; no live DB)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/020_intended_investment.sql").read_text(encoding="utf-8")


def test_020_adds_typed_column_on_analysis_requests():
    assert "alter table analysis_requests" in SQL
    assert "intended_investment numeric(20, 6)" in SQL
    assert "holding_lots" in SQL  # comment only — must not write lots
    assert "update holding_lots" not in SQL.lower()
    assert "insert into holding_lots" not in SQL.lower()


def test_020_accept_rpc_writes_intended_investment():
    assert "p_intended_investment numeric default 0" in SQL
    assert "intended_investment," in SQL
    assert "grant execute on function thesis_accept_analysis" in SQL
    assert "member_role in ('owner', 'member')" in SQL


def test_020_keeps_holdings_gate():
    assert "from holdings h" in SQL
    assert "THS-HOLDING-001" in SQL
    assert "thesis_assert_quota" in SQL
