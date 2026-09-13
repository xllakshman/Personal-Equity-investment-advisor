"""Static checks for Thesis migrations 001–008 (no live DB)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MIG = ROOT / "supabase/migrations"


def _sql(n: str) -> str:
    matches = list(MIG.glob(f"{n}_*.sql"))
    assert matches, n
    return matches[0].read_text(encoding="utf-8")


def test_001_enums_and_conflict_fn():
    sql = _sql("001")
    assert "create type tax_residency" in sql
    assert "create type risk_band" in sql
    assert "thesis_risk_cagr_is_conflict" in sql
    assert "schema_migrations" in sql


def test_002_family_tenant_and_auth_uid():
    sql = _sql("002")
    assert "create table users" in sql
    assert "create table families" in sql
    assert "create table family_members" in sql
    assert "select auth.uid()" in sql
    assert "user_can_read_family" in sql
    assert "user_is_family_owner" in sql


def test_003_plans_are_rows_and_signup_trigger():
    sql = _sql("003")
    assert "create table plans" in sql
    assert "plan_notice_thresholds" in sql
    assert "'trial'" in sql
    assert "handle_new_auth_user" in sql
    assert "on_auth_user_created" in sql


def test_004_lots_source_of_truth_and_invoker_view():
    sql = _sql("004")
    assert "create table holding_lots" in sql
    assert "create or replace view holdings" in sql
    assert "security_invoker = true" in sql
    assert "native_currency" in sql


def test_005_immutable_reports_and_quota_rpcs():
    sql = _sql("005")
    assert "create table analysis_requests" in sql
    assert "create table reports" in sql
    assert "reports_forbid_rewrite" in sql
    assert "thesis_accept_analysis" in sql
    assert "thesis_consume_quota_for_provider" in sql
    assert "thesis_assert_quota" in sql
    assert "grant execute on function thesis_accept_analysis" in sql


def test_006_prompt_not_in_meta_view():
    sql = _sql("006")
    assert "create table prompt_versions" in sql
    assert "create table audit_log" in sql
    assert "support_access_grants" in sql
    assert "prompt_versions_meta" in sql
    assert "from prompt_versions" in sql
    # meta view must not project body
    meta = sql.split("create or replace view prompt_versions_meta")[1].split(";")[0]
    assert "body" not in meta


def test_007_force_rls_and_prompt_revoke():
    sql = _sql("007")
    assert "force row level security" in sql
    assert "revoke all on prompt_versions" in sql
    assert "holding_lots_admin_support" in sql


def test_008_private_pdf_bucket():
    sql = _sql("008")
    assert "report-pdfs" in sql
    assert "public, false" in sql or "false," in sql
    assert "user_can_read_family" in sql


def test_maya_seed_is_synthetic():
    seed = (ROOT / "supabase/seed/001_maya_desk.sql").read_text(encoding="utf-8")
    assert "maya@thesis.demo" in seed
    assert "ThesisMaya!2026" in seed
    assert "AMZN" not in seed
    assert "never the author's" in seed.lower() or "never the author" in seed.lower()
