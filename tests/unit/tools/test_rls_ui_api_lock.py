"""SQL/UI/API must share the same family and meter predicates."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def _read(*parts: str) -> str:
    return (ROOT.joinpath(*parts)).read_text(encoding="utf-8")


def test_write_grant_matches_user_can_write_family() -> None:
    fam = _read("supabase/migrations/002_users_families.sql")
    reports = _read("apps/analysis-api/src/analysis_api/api/routes/reports.py")
    assert "member_role in ('owner', 'member')" in fam
    assert "WRITE_ROLES" in reports
    assert "write=True" in reports
    assert "write=False" in reports


def test_012_assert_and_consume_use_same_meter_kinds() -> None:
    sql = _read("supabase/migrations/012_worker_quotes_and_gate.sql")
    meter = "kind in ('search', 'refine', 'refine_gate')"
    assert sql.count(meter) >= 2
    assert "create or replace function thesis_consume_quota_for_provider" in sql
    assert "create or replace function thesis_family_meter_count" in sql
    assert "create or replace function thesis_assert_quota" in sql


def test_desk_kpi_uses_meter_helper_not_search_only() -> None:
    home = _read("apps/web/lib/desk/load-home.ts")
    meter = _read("apps/web/lib/desk/usage-meter.ts")
    assert "meterEventCount" in home
    assert '.eq("kind", "search")' not in home
    assert "refine_gate" in meter
    assert "prompt_extract_attempt" not in meter.split("USAGE_METER_KINDS")[1][:400]


def test_007_authenticated_cannot_insert_usage_events() -> None:
    rls = _read("supabase/migrations/007_rls.sql")
    assert "revoke insert, update, delete on usage_events from authenticated, anon" in rls
    assert "usage_events_select" in rls


def test_web_never_inserts_usage_events_or_analysis_requests() -> None:
    blobs: list[str] = []
    skip = {"node_modules", ".next", "dist"}
    for path in (ROOT / "apps/web").rglob("*"):
        if skip.intersection(path.parts):
            continue
        if path.suffix not in {".ts", ".tsx"}:
            continue
        blobs.append(path.read_text(encoding="utf-8"))
    joined = "\n".join(blobs)
    assert 'from("usage_events")' in joined
    assert '.from("usage_events").insert' not in joined.replace(" ", "")
    assert '.from("analysis_requests").insert' not in joined.replace(" ", "")
    assert 'rpc("thesis_accept_analysis"' in joined


def test_refine_route_does_not_update_reports() -> None:
    src = _read("apps/analysis-api/src/analysis_api/api/routes/reports.py")
    assert "update reports" not in src.lower()
    assert "insert into refinements" in src.lower()
    assert "kind = refine" in src.lower() or '"refine"' in src
