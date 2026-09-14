"""Static checks for Thesis migration 019 (native labs; no live DB)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/019_native_llm_catalog.sql").read_text(encoding="utf-8")


def test_019_deactivates_google_and_moonshot():
    assert "provider in ('google', 'moonshot')" in SQL
    assert "is_active = false" in SQL


def test_019_keeps_maya_native_ids():
    assert "drop table model_catalog" not in SQL.lower()
    assert "delete from model_catalog" not in SQL.lower()
    assert "opus5" not in SQL  # does not rename Maya FKs
    assert "gpt56m" not in SQL


def test_019_refreshes_plan_allowlists_from_active_rows():
    assert "allowed_model_ids" in SQL
    assert "thesis_class = 'quick'" in SQL
    assert "slug in ('professional', 'premium', 'ultra')" in SQL


def test_019_does_not_call_openrouter():
    assert "openrouter.ai" not in SQL
    assert "openrouter/auto" not in SQL
