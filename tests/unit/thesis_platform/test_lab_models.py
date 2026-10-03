"""Frontier vs quick generation gap for native labs."""
from __future__ import annotations

from thesis_platform.lab_models import (
    LabModel,
    classify_models,
    parse_major,
    vendor_family,
)


def _m(provider: str, model_id: str) -> LabModel:
    return LabModel(
        provider=provider,
        model_id=model_id,
        label=model_id,
        family=vendor_family(provider, model_id),
        major=parse_major(provider, model_id),
        thesis_class="frontier",
    )


def test_openai_gpt4_is_quick_when_gpt6_exists() -> None:
    out = classify_models(
        [
            _m("openai", "gpt-6-astra"),
            _m("openai", "gpt-5.6-sol"),
            _m("openai", "gpt-4o"),
        ]
    )
    by_id = {m.model_id: m.thesis_class for m in out}
    assert by_id["gpt-6-astra"] == "frontier"
    assert by_id["gpt-5.6-sol"] == "frontier"
    assert by_id["gpt-4o"] == "quick"
    assert parse_major("openai", "gpt-5.6-sol") == 5
    assert parse_major("openai", "gpt-4o") == 4


def test_anthropic_opus4_is_quick_vs_opus5() -> None:
    out = classify_models(
        [
            _m("anthropic", "claude-opus-5"),
            _m("anthropic", "claude-opus-4"),
            _m("anthropic", "claude-sonnet-4"),
            _m("anthropic", "claude-haiku-4-5"),
        ]
    )
    by_id = {m.model_id: m.thesis_class for m in out}
    assert by_id["claude-opus-5"] == "frontier"
    assert by_id["claude-opus-4"] == "quick"
    assert by_id["claude-sonnet-4"] == "frontier"
    assert by_id["claude-haiku-4-5"] == "quick"


def test_xai_and_deepseek_use_two_generation_gap() -> None:
    out = classify_models(
        [
            _m("xai", "grok-4.6"),
            _m("xai", "grok-3"),
            _m("xai", "grok-2"),
            _m("deepseek", "deepseek-v4"),
            _m("deepseek", "deepseek-v2"),
        ]
    )
    by_id = {m.model_id: m.thesis_class for m in out}
    assert by_id["grok-4.6"] == "frontier"
    assert by_id["grok-3"] == "frontier"
    assert by_id["grok-2"] == "quick"
    assert by_id["deepseek-v4"] == "frontier"
    assert by_id["deepseek-v2"] == "quick"
