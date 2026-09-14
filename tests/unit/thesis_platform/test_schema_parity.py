"""Unit tests for DEV vs PROD schema parity (no live DB)."""

from __future__ import annotations

from pathlib import Path

import pytest

from thesis_platform.schema_parity import (
    DEV_PROJECT_REF,
    MAYA_SEED_RELPATH,
    PROD_PROJECT_REF,
    SchemaInventory,
    apply_gate,
    assert_env_hosts,
    build_report,
    format_report,
    list_git_migrations,
    parse_env_file,
    pending_migration_files,
    project_ref_from_url,
)

ROOT = Path(__file__).resolve().parents[3]


def test_project_refs_are_distinct() -> None:
    assert DEV_PROJECT_REF != PROD_PROJECT_REF
    assert project_ref_from_url("https://cmksomahsfmsjufakryw.supabase.co") == DEV_PROJECT_REF
    assert project_ref_from_url("https://ndgvglcrkbygovlszxze.supabase.co") == PROD_PROJECT_REF
    assert project_ref_from_url("db.ndgvglcrkbygovlszxze.supabase.co") == PROD_PROJECT_REF


def test_parse_env_file_skips_comments(tmp_path: Path) -> None:
    path = tmp_path / ".env"
    path.write_text(
        "# secret=nope\nexport SUPABASE_URL=https://cmksomahsfmsjufakryw.supabase.co\n"
        "SUPABASE_DB_PASSWORD=demo\n\n",
        encoding="utf-8",
    )
    parsed = parse_env_file(path)
    assert parsed["SUPABASE_URL"].endswith("cmksomahsfmsjufakryw.supabase.co")
    assert "secret" not in parsed


def test_assert_env_hosts_rejects_swap() -> None:
    dev = {
        "SUPABASE_URL": f"https://{PROD_PROJECT_REF}.supabase.co",
        "SUPABASE_DB_PASSWORD": "x",
    }
    prod = {
        "SUPABASE_URL": f"https://{DEV_PROJECT_REF}.supabase.co",
        "SUPABASE_DB_PASSWORD": "y",
    }
    with pytest.raises(RuntimeError):
        assert_env_hosts(dev=dev, prod=prod)


def test_assert_env_hosts_rejects_empty_prod_password() -> None:
    dev = {
        "SUPABASE_URL": f"https://{DEV_PROJECT_REF}.supabase.co",
        "SUPABASE_DB_PASSWORD": "x",
    }
    prod = {
        "SUPABASE_URL": f"https://{PROD_PROJECT_REF}.supabase.co",
        "SUPABASE_DB_PASSWORD": "",
        "NEXT_PUBLIC_SUPABASE_URL": f"https://{PROD_PROJECT_REF}.supabase.co",
    }
    with pytest.raises(RuntimeError, match="PROD SUPABASE_DB_PASSWORD"):
        assert_env_hosts(dev=dev, prod=prod)


def test_empty_prod_pending_is_every_git_file() -> None:
    git = list_git_migrations(ROOT / "supabase/migrations")
    assert [mid for mid, _ in git] == list(range(1, 20))
    pending = pending_migration_files(git, set())
    assert [p.name[:3] for p in pending] == [f"{n:03d}" for n in range(1, 20)]


def test_pending_skips_already_applied() -> None:
    git = [(1, Path("001_a.sql")), (2, Path("002_b.sql"))]
    pending = pending_migration_files(git, {1})
    assert [p.name for p in pending] == ["002_b.sql"]


def test_empty_prod_gate_passes_and_does_not_apply_maya() -> None:
    git = list_git_migrations(ROOT / "supabase/migrations")
    dev = SchemaInventory(
        project_ref=DEV_PROJECT_REF,
        migrations=tuple((mid, path.name) for mid, path in git),
        tables=("holding_lots", "users"),
        views=("holdings",),
        functions=("thesis_accept_analysis",),
        enums=("risk_band",),
        rls_on=("holding_lots",),
        buckets=("report-pdfs",),
        row_counts={"holdings": 5, "users": 1},
    )
    prod = SchemaInventory(
        project_ref=PROD_PROJECT_REF,
        row_counts={"holdings": None, "users": None},
    )
    report = build_report(
        git_files=git,
        dev=dev,
        prod=prod,
        native_llm_keys_set=(),
    )
    assert report.apply_ok is True
    assert report.seed_would_apply is False
    assert MAYA_SEED_RELPATH not in report.pending_files
    assert report.pending_files[0].startswith("001_")
    assert report.pending_files[-1].startswith("019_")
    assert report.tables_only_dev == ("holding_lots", "users")
    assert report.row_counts_dev["holdings"] == 5
    text = format_report(report)
    assert "DEV schema_migrations" in text
    assert "PROD schema_migrations" in text
    assert "Maya seed" in text
    assert "Would NOT apply" in text
    assert "nope-secret" not in text
    assert "Native lab keys in .env.prod: 0/4 set" in text


def test_extra_prod_table_blocks_apply() -> None:
    ok, reason = apply_gate(
        git_missing_on_dev=(),
        extra_prod_migrations=(),
        tables_only_prod=("gst_invoices",),
        views_only_prod=(),
    )
    assert ok is False
    assert "gst_invoices" in reason


def test_dev_missing_git_blocks_apply() -> None:
    ok, _reason = apply_gate(
        git_missing_on_dev=(18,),
        extra_prod_migrations=(),
        tables_only_prod=(),
        views_only_prod=(),
    )
    assert ok is False


def test_parity_when_prod_already_has_git_ids() -> None:
    git = [(1, Path("001_a.sql")), (2, Path("002_b.sql"))]
    inv = SchemaInventory(
        project_ref=PROD_PROJECT_REF,
        migrations=((1, "001_a.sql"), (2, "002_b.sql")),
        tables=("users",),
        views=(),
        row_counts={"holdings": 0},
    )
    report = build_report(
        git_files=git,
        dev=inv,
        prod=inv,
        native_llm_keys_set=("OPENAI_API_KEY",),
    )
    assert report.pending_files == ()
    assert report.apply_ok is True
