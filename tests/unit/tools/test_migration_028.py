"""Static checks for Thesis migration 028 (holding_lots.lot_kind)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/028_holding_lot_kind.sql").read_text(
    encoding="utf-8"
)


def test_028_adds_lot_kind_and_rebuilds_holdings_view() -> None:
    assert "insert into schema_migrations (id, name) values (28," in SQL
    assert "add column if not exists lot_kind text not null default 'retail'" in SQL
    assert "check (lot_kind in ('retail', 'esop'))" in SQL
    assert "create or replace view holdings as" in SQL
    assert "group by family_id, portfolio_id, ticker, exchange, native_currency, lot_kind" in SQL
    assert "security_invoker" in SQL
    assert "grant select on holdings to authenticated" in SQL
    assert "Do not apply without CONFIRM_APPLY=1" in SQL
    assert "apply_family_rls" not in SQL
    assert "drop policy" not in SQL
    assert "eod_quotes" not in SQL
    body = SQL.split("create or replace view holdings as", 1)[1]
    assert "lot_kind" in body.split("group by")[0]
    # Column must be last so CREATE OR REPLACE VIEW can add it.
    select = body.split("from holding_lots")[0]
    assert select.rstrip().endswith("lot_kind")
