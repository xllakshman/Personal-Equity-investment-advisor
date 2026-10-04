"""Static checks for Thesis migration 026 (admin prompt remove)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/026_admin_prompt_remove.sql").read_text(
    encoding="utf-8"
)


def test_026_archives_or_deletes_without_table_delete_grant():
    assert "insert into schema_migrations (id, name) values (26," in SQL
    assert "archived_at" in SQL
    assert "thesis_admin_remove_prompt" in SQL
    assert "is_current_user_platform_admin" in SQL
    assert "THS-PROMPT-001" in SQL
    assert "THS-ADM-001" in SQL
    assert "grant execute on function thesis_admin_remove_prompt" in SQL
    assert "delete from prompt_versions" in SQL
    assert "foreign_key_violation" in SQL
    assert "grant delete on prompt_versions to" not in SQL.lower()
    meta = SQL.split("create or replace view prompt_versions_meta")[1].split(";")[0]
    assert "archived_at" in meta
    assert "role" in meta
    assert "body" not in meta
    assert "from reports" in SQL
    assert "from weekly_digests" in SQL
