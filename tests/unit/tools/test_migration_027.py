"""Static checks for Thesis migration 027 (Frontier 1.5 search credits)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/027_search_credit_quantity.sql").read_text(
    encoding="utf-8"
)


def test_027_adds_quantity_and_sums_meter_kinds() -> None:
    assert "insert into schema_migrations (id, name) values (27," in SQL
    assert "drop function if exists thesis_family_meter_count(uuid, date)" in SQL
    assert "add column if not exists quantity numeric(8, 2)" in SQL
    assert "create or replace function thesis_family_meter_count" in SQL
    assert "create or replace function thesis_assert_quota" in SQL
    assert "create or replace function thesis_consume_quota_for_provider" in SQL
    assert "kind in ('search', 'refine', 'refine_gate')" in SQL
    assert "prompt_extract_attempt" not in SQL.split("kind in")[1][:200]
    assert "sum(ue.quantity)" in SQL
    assert "thesis_class = 'frontier' then 1.5" in SQL
    meter = SQL.split("create or replace function thesis_family_meter_count")[1].split(
        "$$;"
    )[0]
    assert "prompt_extract_attempt" not in meter
    assert "pdf" not in meter
    assert "Do not apply without CONFIRM_APPLY=1" in SQL
