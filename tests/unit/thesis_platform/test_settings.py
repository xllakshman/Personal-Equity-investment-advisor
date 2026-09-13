"""Settings.from_env fails closed without URL/password."""
from __future__ import annotations

import pytest

from thesis_platform.config import Settings


def test_from_env_requires_password(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://cmksomahsfmsjufakryw.supabase.co")
    monkeypatch.delenv("SUPABASE_DB_PASSWORD", raising=False)
    with pytest.raises(RuntimeError, match="SUPABASE_DB_PASSWORD"):
        Settings.from_env()
