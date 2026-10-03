"""Static checks for Thesis migration 023 (admin prompt promote)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/023_admin_prompt_promote.sql").read_text(
    encoding="utf-8"
)


def test_023_grants_prompt_body_only_with_admin_rls():
    assert "grant select, insert, update on prompt_versions to authenticated" in SQL
    assert "thesis_admin_promote_prompt" in SQL
    assert "is_current_user_platform_admin" in SQL
    assert "grant execute on function thesis_admin_promote_prompt" in SQL
    assert "delete on prompt_versions" not in SQL
    meta = SQL.split("create or replace view prompt_versions_meta")[1].split(";")[0]
    assert "role" in meta
    assert "body" not in meta
