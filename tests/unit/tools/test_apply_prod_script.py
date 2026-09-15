"""Static checks for prod apply / dry-run scripts (no live DB)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
APPLY = (ROOT / "tools/db/apply_prod.sh").read_text(encoding="utf-8")
DRY = (ROOT / "tools/db/prod_dry_run.py").read_text(encoding="utf-8")


def test_apply_prod_defaults_to_dry_run() -> None:
    assert 'MODE="dry-run"' in APPLY
    assert "--apply" in APPLY
    assert "prod_dry_run.py" in APPLY
    assert "run_seed_001_maya" not in APPLY
    assert "CONFIRM_APPLY" in APPLY


def test_apply_prod_runs_dry_run_before_writes() -> None:
    dry_at = APPLY.find("prod_dry_run.py")
    apply_loop = APPLY.find("run_migration.sh")
    assert 0 <= dry_at < apply_loop
    assert "Dry-run gate failed" in APPLY
    assert "print-pending" in APPLY
    assert "mapfile" not in APPLY


def test_dry_run_is_readonly_session() -> None:
    assert "readonly=True" in DRY
    assert "autocommit=True" in DRY
    assert "fetch_inventory" in DRY
    assert "run_migration.sh" not in DRY
    assert "apply_foundation" not in DRY
    assert "SUPABASE_DB_USER" in DRY
    assert "ipv4_hostaddr" in DRY
