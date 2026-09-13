"""Settings must not silently target another Supabase project."""
from __future__ import annotations

import pytest

from thesis_platform.config import resolve_db_host


def test_resolve_db_host_from_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SUPABASE_DB_HOST", raising=False)
    monkeypatch.setenv("SUPABASE_URL", "https://cmksomahsfmsjufakryw.supabase.co")
    assert resolve_db_host() == "db.cmksomahsfmsjufakryw.supabase.co"


def test_resolve_db_host_requires_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SUPABASE_DB_HOST", raising=False)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="required"):
        resolve_db_host()
