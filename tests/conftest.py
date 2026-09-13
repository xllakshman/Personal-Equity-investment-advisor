"""Shared pytest fixtures. Integration tests skip without credentials."""
from __future__ import annotations

import os

import pytest


@pytest.fixture
def settings_from_env():
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_DB_PASSWORD"):
        pytest.skip("SUPABASE_URL and SUPABASE_DB_PASSWORD required")
    from thesis_platform.config import Settings

    return Settings.from_env()
