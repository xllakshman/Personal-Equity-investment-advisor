"""Static checks for Thesis migration 009 (model catalog refresh, no live DB)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/009_model_catalog_refresh.sql").read_text(encoding="utf-8")


def test_009_keeps_maya_catalog_ids():
    for catalog_id in ("opus5", "gpt56", "gpt56m", "sonnet48", "gemini35"):
        assert catalog_id in SQL


def test_009_provider_ids_match_2026_09_labs():
    assert "gpt-6-astra" in SQL
    assert "gpt-5.6-sol" in SQL
    assert "gpt-5.6-luna" in SQL
    assert "claude-fable-5-1" in SQL
    assert "claude-opus-5" in SQL
    assert "claude-sonnet-5" in SQL
    assert "claude-haiku-4-5" in SQL
    assert "gemini-3.1-pro-preview" in SQL
    assert "gemini-3.8-flash" in SQL
    assert "deepseek-flash" in SQL
    assert "grok-4.6" in SQL
    assert "kimi-k3" in SQL
    assert "claude-opus-4-8" not in SQL
    assert "gpt-5.6-mini" not in SQL


def test_009_thesis_class_is_frontier_or_quick():
    assert "thesis_class in ('frontier', 'quick')" in SQL
    assert "vendor_class" in SQL
    assert "is_refine_gate" in SQL


def test_009_openrouter_slugs_and_pins():
    assert "openrouter_model_id" in SQL
    assert "openrouter_only" in SQL
    assert "anthropic/claude-opus-5" in SQL
    assert "openai/gpt-6-astra" in SQL
    assert "openai/gpt-5.6-luna" in SQL
    assert "google/gemini-3.8-flash" in SQL
    assert "deepseek/deepseek-flash" in SQL
    assert "x-ai/grok-4.6" in SQL
    assert "moonshotai/kimi-k3" in SQL
    assert "openrouter/auto" not in SQL
    assert "tier" in SQL


def test_009_does_not_drop_maya_fks():
    assert "drop table model_catalog" not in SQL.lower()
    assert "delete from model_catalog" not in SQL.lower()
