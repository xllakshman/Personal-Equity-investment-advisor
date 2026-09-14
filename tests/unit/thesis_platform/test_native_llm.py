"""Native lab payloads (D39). HTTP model is provider_model_id, never an OpenRouter slug."""
from __future__ import annotations

import pytest

from thesis_platform.config import Settings
from thesis_platform.native_llm import (
    ANTHROPIC_URL,
    DEEPSEEK_URL,
    LlmError,
    OPENAI_URL,
    XAI_URL,
    openai_compat_payload,
    parse_response,
    request_spec,
    require_api_key,
)


SETTINGS = Settings(
    supabase_url="https://example.supabase.co",
    supabase_db_host="db.example.supabase.co",
    supabase_db_password="x",
    anthropic_api_key="sk-ant-test",
    openai_api_key="sk-openai-test",
)


def test_opus5_posts_anthropic_native_id() -> None:
    url, headers, payload = request_spec(
        "anthropic",
        model="claude-opus-5",
        system="static prefix",
        user="variable pack",
    )
    assert url == ANTHROPIC_URL
    assert headers["anthropic-version"]
    assert payload["model"] == "claude-opus-5"
    assert "haiku" not in payload["model"]
    assert "/" not in payload["model"]
    assert payload["model"] != "openrouter/auto"
    assert payload["system"][0]["cache_control"]["type"] == "ephemeral"


def test_openai_xai_deepseek_use_compat_urls() -> None:
    openai_url, _, openai_body = request_spec(
        "openai", model="gpt-5.6-sol", system="s", user="u"
    )
    xai_url, _, grok_body = request_spec("xai", model="grok-4.6", system="s", user="u")
    ds_url, _, ds_body = request_spec(
        "deepseek", model="deepseek-flash", system="s", user="u"
    )
    assert openai_url == OPENAI_URL
    assert xai_url == XAI_URL
    assert ds_url == DEEPSEEK_URL
    assert openai_body["model"] == "gpt-5.6-sol"
    assert grok_body["model"] == "grok-4.6"
    assert ds_body["model"] == "deepseek-flash"
    assert "provider" not in openai_body


def test_forbids_openrouter_slugs() -> None:
    with pytest.raises(LlmError, match="forbidden"):
        openai_compat_payload(model="openrouter/auto", system="s", user="u")
    with pytest.raises(LlmError, match="forbidden"):
        openai_compat_payload(model="anthropic/claude-opus-5", system="s", user="u")


def test_response_model_must_match_native_id() -> None:
    body = {
        "model": "claude-haiku-4-5",
        "content": [{"type": "text", "text": "{}"}],
    }
    with pytest.raises(LlmError, match="does not match"):
        parse_response("anthropic", body, "claude-opus-5")


def test_anthropic_text_blocks_and_openai_usage_cents() -> None:
    anth = parse_response(
        "anthropic",
        {
            "model": "claude-opus-5",
            "content": [{"type": "text", "text": '{"verdict":"Hold"}'}],
        },
        "claude-opus-5",
    )
    assert anth.content == '{"verdict":"Hold"}'
    assert "static prefix" not in anth.content
    openai = parse_response(
        "openai",
        {
            "model": "gpt-5.6-luna",
            "choices": [{"message": {"content": '{"verdict":"Hold"}'}}],
            "usage": {"cost": 0.18},
        },
        "gpt-5.6-luna",
    )
    assert openai.cost_cents == 18


def test_missing_provider_key() -> None:
    empty = Settings(
        supabase_url="https://example.supabase.co",
        supabase_db_host="db.example.supabase.co",
        supabase_db_password="x",
    )
    with pytest.raises(LlmError, match="ANTHROPIC_API_KEY missing"):
        require_api_key(empty, "anthropic")
    assert require_api_key(SETTINGS, "anthropic") == "sk-ant-test"
    with pytest.raises(LlmError, match="unsupported provider"):
        require_api_key(SETTINGS, "google")
