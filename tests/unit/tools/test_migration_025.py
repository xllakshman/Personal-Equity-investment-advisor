"""Static checks for Thesis migration 025 (admin plan activate)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/025_admin_plan_activation.sql").read_text(
    encoding="utf-8"
)


def test_025_admin_sets_plan_without_desk_self_activate():
    assert "insert into schema_migrations (id, name) values (25," in SQL
    assert "thesis_admin_set_family_plan" in SQL
    assert "THS-ADM-001" in SQL
    assert "invoices_admin_select" in SQL
    assert "families_admin_update" in SQL
    assert "grant execute on function thesis_admin_set_family_plan" in SQL
    assert "billing_status = v_status" in SQL
    assert "status = 'succeeded'" in SQL
    assert "status = 'cancelled'" in SQL
