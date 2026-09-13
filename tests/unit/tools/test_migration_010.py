"""Static checks for Thesis migration 010 (investor_profiles, no live DB)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/010_investor_profiles.sql").read_text(encoding="utf-8")
PROMPT = (ROOT / "supabase/migrations/006_prompt_audit.sql").read_text(encoding="utf-8")


def test_010_creates_family_scoped_profile():
    assert "create table investor_profiles" in SQL
    assert "family_id" in SQL
    assert "max_positions" not in SQL
    assert "concentration_cap_pct" in SQL
    assert "default 15" in SQL
    assert "ltcg_holding_months" in SQL
    assert "lrs_enabled" in SQL
    assert "lrs_annual_cap_usd" in SQL
    assert "blackout_windows" in SQL
    assert "outside_book" in SQL
    assert "cannot_trade_us_options" in SQL
    assert "tranche_t1_pct" in SQL
    assert "user_is_family_owner" in SQL
    assert "force row level security" in SQL


def test_010_india_ltcg_24_and_no_maya_lrs_cap():
    assert "then 24 else 12" in SQL
    assert "p_residency = 'india'" in SQL
    assert "150000" not in SQL
    assert "150,000" not in SQL
    assert "AMZN" not in SQL


def test_006_bootstrap_prompt_has_no_required_150k():
    body = PROMPT.split("$prompt$")[1]
    assert "$150,000" not in body
    assert "150000" not in body
    assert "150,000" not in body
