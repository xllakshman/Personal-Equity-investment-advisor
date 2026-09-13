"""Risk/CAGR conflict matches Thesis.dc.html (risk <= 1 and cagr >= 2)."""
from pathlib import Path

SQL = Path(__file__).resolve().parents[3] / "supabase/migrations/001_extensions_enums.sql"


def test_conflict_function_encodes_mock_matrix():
    text = SQL.read_text(encoding="utf-8")
    assert "low_0_10" in text
    assert "medium_11_20" in text
    assert "high_18_25" in text
    assert "extreme_25_plus" in text
    fn = text.split("create or replace function thesis_risk_cagr_is_conflict")[1].split("$$;")[0]
    assert "low_0_10" in fn
    assert "medium_11_20" in fn
    assert "high_18_25" in fn
    assert "extreme_25_plus" in fn
