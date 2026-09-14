"""Static checks for migrations 014–018."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def _sql(name: str) -> str:
    return (ROOT / "supabase/migrations" / name).read_text(encoding="utf-8")


def test_014_observability_never_stores_sections() -> None:
    sql = _sql("014_observability.sql")
    assert "create table observability_events" in sql
    assert "observability_record_event" in sql
    assert "observability_upsert_threshold" in sql
    create = sql.split("create table observability_events")[1].split("create index")[0]
    assert "sections" not in create
    assert "prompt" not in create.lower()


def test_015_invite_roles() -> None:
    sql = _sql("015_family_invite.sql")
    assert "thesis_invite_family_member" in sql
    assert "member_role = 'owner'" in sql
    assert "'member', 'viewer'" in sql or "member or viewer" in sql


def test_016_weekly_digest() -> None:
    sql = _sql("016_weekly_digest.sql")
    assert "weekly_digest_opt_in" in sql
    assert "weekly_digest_ticker_limit" in sql
    assert "create table weekly_digests" in sql
    assert "weekly_digest" in sql
    assert "thesis_set_weekly_digest_opt_in" in sql
    assert "THS-WD-001" in sql


def test_017_crash_letters() -> None:
    sql = _sql("017_crash_letters.sql")
    assert "create table crash_letters" in sql
    assert "apply_family_rls('public.crash_letters')" in sql


def test_018_managers() -> None:
    sql = _sql("018_manager_watches.sql")
    assert "create table manager_watches" in sql
    assert "manager_holdings_snapshots" in sql
