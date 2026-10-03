"""Static checks for Thesis migration 024 (one in-flight Analyse Submit)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SQL = (ROOT / "supabase/migrations/024_one_inflight_analysis.sql").read_text(
    encoding="utf-8"
)


def test_024_blocks_second_submit_while_request_runs():
    assert "insert into schema_migrations (id, name) values (24," in SQL
    assert "THS-BUSY-001" in SQL
    assert "thesis_accept_analysis" in SQL
    assert "grant execute on function thesis_accept_analysis" in SQL
    busy = SQL.split("if exists")[1].split("perform thesis_assert_quota")[0]
    for status in ("queued", "gathering", "drafting", "checking", "rendering"):
        assert status in busy
    assert "'ready'" not in busy
    assert "'failed'" not in busy
    assert "'rejected'" not in busy
