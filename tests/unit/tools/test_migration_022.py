"""Static checks for Thesis migration 022 (elite books + run qty/cost)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/022_elite_books_run_qty.sql").read_text(
    encoding="utf-8"
)


def test_022_creates_elite_books_without_family_id():
    assert "create table elite_investor_books" in SQL
    assert "family_id" not in SQL.split("create table elite_investor_books")[1].split(
        "alter table analysis_requests"
    )[0]
    assert "to authenticated" in SQL
    assert "grant select, insert, update on elite_investor_books" in SQL


def test_022_accept_rpc_stores_run_qty_not_lots():
    assert "run_qty numeric(20, 6)" in SQL
    assert "run_cost_per_share numeric(20, 6)" in SQL
    assert "p_run_qty numeric default 0" in SQL
    assert "p_run_cost_per_share numeric default 0" in SQL
    assert "update holding_lots" not in SQL.lower()
    assert "THS-TICKER-001" in SQL
    assert "'search'" in SQL
    insert_at = SQL.index("insert into analysis_requests")
    usage_at = SQL.index("insert into usage_events")
    assert insert_at < usage_at
