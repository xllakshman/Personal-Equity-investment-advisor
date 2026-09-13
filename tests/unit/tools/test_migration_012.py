"""Static checks for migration 012."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/012_worker_quotes_and_gate.sql").read_text(encoding="utf-8")
PROMPT = (ROOT / "supabase/migrations/006_prompt_audit.sql").read_text(encoding="utf-8")


def test_012_eod_quotes_and_gate() -> None:
    assert "create table eod_quotes" in SQL
    assert "yahoo_symbol" in SQL
    assert "refine_gate" in SQL
    assert "prompt_versions" in SQL
    assert "refine_gate" in SQL
    assert "proceeded" in SQL
    assert "thesis_family_meter_count" in SQL
    assert "kind in ('search', 'refine', 'refine_gate')" in SQL
    assert "create or replace function thesis_consume_quota_for_provider" in SQL
    assert "request_id is distinct from p_request_id" in SQL


def test_gate_body_is_not_advisor_body() -> None:
    advisor = PROMPT.split("$prompt$")[1]
    gate = SQL.split("$gate$")[1]
    assert "PERSONAL INVESTMENT ADVISOR" not in gate
    assert gate.strip() not in advisor
    assert "material" in gate
