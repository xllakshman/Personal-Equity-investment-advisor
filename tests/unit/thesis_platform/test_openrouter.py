"""OpenRouter adapter payload (D39)."""
from __future__ import annotations

import pytest

from thesis_platform.openrouter import OpenRouterError, build_payload, parse_response


def test_opus5_posts_slug_without_fallbacks() -> None:
    payload = build_payload(
        model="anthropic/claude-opus-5",
        openrouter_only="anthropic",
        system="static prefix",
        user="variable pack",
    )
    assert payload["model"] == "anthropic/claude-opus-5"
    assert payload["provider"]["allow_fallbacks"] is False
    assert payload["provider"]["only"] == ["anthropic"]
    assert "haiku" not in payload["model"]
    assert payload["model"] != "openrouter/auto"


def test_forbids_auto() -> None:
    with pytest.raises(OpenRouterError, match="forbidden"):
        build_payload(
            model="openrouter/auto",
            openrouter_only="openai",
            system="s",
            user="u",
        )


def test_response_model_must_match_slug() -> None:
    body = {
        "model": "anthropic/claude-haiku-4.5",
        "choices": [{"message": {"content": "{}"}}],
        "usage": {"cost": 0.02},
    }
    with pytest.raises(OpenRouterError, match="does not match"):
        parse_response(body, "anthropic/claude-opus-5")


def test_usage_cost_to_cents() -> None:
    body = {
        "model": "anthropic/claude-opus-5",
        "choices": [{"message": {"content": '{"verdict":"Hold"}'}}],
        "usage": {"cost": 0.18},
    }
    out = parse_response(body, "anthropic/claude-opus-5")
    assert out.cost_cents == 18
    assert "static prefix" not in out.content
