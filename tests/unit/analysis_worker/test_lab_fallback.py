"""Worker uses a keyed lab when the queued agent's env key is missing."""
from __future__ import annotations

import pytest

from analysis_worker.jobs.complete import _lab_for_request
from thesis_platform.config import Settings


class _Cur:
    def __init__(self, row: dict | None) -> None:
        self.row = row
        self.params: tuple | None = None

    def execute(self, _sql: str, params=None) -> None:
        self.params = params

    def fetchone(self):
        return self.row


def test_lab_keeps_queued_provider_when_key_is_set() -> None:
    settings = Settings(
        supabase_url="https://example.supabase.co",
        supabase_db_host="db.example.supabase.co",
        supabase_db_password="x",
        anthropic_api_key="sk-ant-test",
    )
    model = {
        "id": "m-ant",
        "provider": "anthropic",
        "provider_model_id": "claude-opus-5",
        "thesis_class": "frontier",
    }
    assert _lab_for_request(_Cur(None), settings, model) == (
        "anthropic",
        "claude-opus-5",
        "m-ant",
    )


def test_lab_falls_back_to_keyed_catalog_row() -> None:
    settings = Settings(
        supabase_url="https://example.supabase.co",
        supabase_db_host="db.example.supabase.co",
        supabase_db_password="x",
        openai_api_key="sk-openai-test",
    )
    model = {
        "id": "m-ant",
        "provider": "anthropic",
        "provider_model_id": "claude-opus-5",
        "thesis_class": "frontier",
    }
    cur = _Cur(
        {
            "id": "m-oai",
            "provider": "openai",
            "provider_model_id": "gpt-5.6-sol",
            "thesis_class": "frontier",
        }
    )
    assert _lab_for_request(cur, settings, model) == (
        "openai",
        "gpt-5.6-sol",
        "m-oai",
    )
    assert cur.params == ("openai", "frontier")


def test_lab_errors_when_no_keys() -> None:
    settings = Settings(
        supabase_url="https://example.supabase.co",
        supabase_db_host="db.example.supabase.co",
        supabase_db_password="x",
    )
    model = {
        "id": "m-ant",
        "provider": "anthropic",
        "provider_model_id": "claude-opus-5",
        "thesis_class": "frontier",
    }
    with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY missing"):
        _lab_for_request(_Cur(None), settings, model)
