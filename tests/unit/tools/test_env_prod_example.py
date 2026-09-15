"""Prod env template must not point at DEV or contain secret-looking values."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EXAMPLE = (ROOT / ".env.prod.example").read_text(encoding="utf-8")
GITIGNORE = (ROOT / ".gitignore").read_text(encoding="utf-8")


def test_prod_example_points_at_prod_not_dev() -> None:
    assert "ndgvglcrkbygovlszxze" in EXAMPLE
    assert "cmksomahsfmsjufakryw" not in EXAMPLE
    assert "SUPABASE_ANON_KEY=\n" in EXAMPLE or "SUPABASE_ANON_KEY=\r\n" in EXAMPLE
    assert "eyJ" not in EXAMPLE
    assert "NEXT_PUBLIC_SUPABASE_ANON_KEY=" in EXAMPLE
    assert "SUPABASE_SERVICE_KEY=" in EXAMPLE
    assert "PORKBUN_API_KEY=" in EXAMPLE
    assert "PORKBUN_SECRET_KEY=" in EXAMPLE
    assert "RESEND_API_KEY=" in EXAMPLE


def test_prod_example_resend_key_is_empty() -> None:
    lines = [ln.strip() for ln in EXAMPLE.splitlines() if ln.startswith("RESEND_API_KEY=")]
    assert lines == ["RESEND_API_KEY="]


def test_gitignore_keeps_prod_file_out_of_git() -> None:
    assert ".env.prod" in GITIGNORE
    assert "!.env.prod.example" in GITIGNORE
