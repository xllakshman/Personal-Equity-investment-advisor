"""Native lab chat completions (OpenAI, Anthropic, xAI, DeepSeek). No OpenRouter."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
import random
import re
from typing import Any

from thesis_platform.config import Settings

LAB_ORDER = ("anthropic", "openai", "xai", "deepseek")
NATIVE_PROVIDERS = frozenset(LAB_ORDER)
FORBIDDEN_MODELS = frozenset({"openrouter/auto", "openrouter/auto:nitro"})

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
XAI_URL = "https://api.x.ai/v1/chat/completions"
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
ANTHROPIC_VERSION = "2023-06-01"
ANTHROPIC_MAX_TOKENS = 32768
OPENAI_MAX_OUTPUT_TOKENS = 16384

# OpenAI Chat Completions (2026 docs): `max_tokens` is deprecated in favor of
# `max_completion_tokens` and is rejected on o-series / gpt-5+ / gpt-4.1 / gpt-4.5.
# Older gpt-4o / gpt-4-turbo still accept `max_tokens`. xAI and DeepSeek keep
# `max_tokens` even when they share this JSON shape.
_O_SERIES_MODEL = re.compile(r"^o[1-9]")
_GPT_MAJOR_MODEL = re.compile(r"^gpt-(\d+)")


class LlmError(RuntimeError):
    pass


@dataclass(frozen=True)
class ChatResult:
    content: str
    response_model: str
    cost_cents: int | None
    raw: dict[str, Any]
    stop_reason: str | None = None


def api_key_for_provider(settings: Settings, provider: str) -> tuple[str, str]:
    """Return (api_key, env_var_name)."""
    mapping = {
        "openai": (settings.openai_api_key, "OPENAI_API_KEY"),
        "anthropic": (settings.anthropic_api_key, "ANTHROPIC_API_KEY"),
        "xai": (settings.xai_api_key, "XAI_API_KEY"),
        "deepseek": (settings.deepseek_api_key, "DEEPSEEK_API_KEY"),
    }
    if provider not in mapping:
        raise LlmError(f"unsupported provider {provider}")
    key, env_name = mapping[provider]
    return key, env_name


def require_api_key(settings: Settings, provider: str) -> str:
    key, env_name = api_key_for_provider(settings, provider)
    if not key:
        raise LlmError(f"{env_name} missing")
    return key


def available_providers(settings: Settings) -> tuple[str, ...]:
    """Labs whose env key is set: Anthropic, OpenAI, xAI, DeepSeek."""
    found: list[str] = []
    for name in LAB_ORDER:
        key, _env = api_key_for_provider(settings, name)
        if key:
            found.append(name)
    return tuple(found)


def resolve_provider(
    settings: Settings,
    requested: str,
    *,
    choice: Callable[[Sequence[str]], str] | None = None,
) -> str:
    """Use the requested lab when its key exists; otherwise pick a keyed lab at random."""
    available = available_providers(settings)
    if requested in available:
        return requested
    if not available:
        require_api_key(settings, requested)
    picker = choice or random.choice
    return str(picker(available))


def assert_model_allowed(model: str) -> None:
    if not model or model in FORBIDDEN_MODELS:
        raise LlmError("forbidden model slug")
    if "auto" in model.lower() or "/" in model:
        raise LlmError("forbidden model slug")


def openai_json_schema_response_format(
    name: str, schema: dict[str, Any]
) -> dict[str, Any]:
    """OpenAI Chat Completions documented `response_format`. Not used unless requested."""
    return {
        "type": "json_schema",
        "json_schema": {
            "name": name,
            "schema": schema,
        },
    }


def openai_uses_max_completion_tokens(model: str) -> bool:
    """True when OpenAI Chat Completions rejects `max_tokens` for this model id."""
    slug = (model or "").strip().lower()
    if not slug:
        return False
    if _O_SERIES_MODEL.match(slug):
        return True
    if slug.startswith(("gpt-4.1", "gpt-4.5")):
        return True
    found = _GPT_MAJOR_MODEL.match(slug)
    return bool(found and int(found.group(1)) >= 5)


def _openai_compat_token_limit_key(provider: str, model: str) -> str:
    if provider == "openai" and openai_uses_max_completion_tokens(model):
        return "max_completion_tokens"
    return "max_tokens"


def openai_compat_payload(
    *,
    model: str,
    system: str,
    user: str,
    json_schema: dict[str, Any] | None = None,
    json_schema_name: str = "investor_note",
    provider: str = "openai",
    max_output_tokens: int | None = OPENAI_MAX_OUTPUT_TOKENS,
) -> dict[str, Any]:
    assert_model_allowed(model)
    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    if max_output_tokens is not None and max_output_tokens > 0:
        payload[_openai_compat_token_limit_key(provider, model)] = max_output_tokens
    if json_schema:
        payload["response_format"] = openai_json_schema_response_format(
            json_schema_name, json_schema
        )
    return payload


def anthropic_payload(*, model: str, system: str, user: str) -> dict[str, Any]:
    assert_model_allowed(model)
    return {
        "model": model,
        "max_tokens": ANTHROPIC_MAX_TOKENS,
        "system": [
            {
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        "messages": [
            {"role": "user", "content": user},
        ],
    }


def request_spec(
    provider: str,
    *,
    model: str,
    system: str,
    user: str,
    json_schema: dict[str, Any] | None = None,
) -> tuple[str, dict[str, str], dict[str, Any]]:
    """URL, headers (without auth), JSON body.

    `json_schema` is OpenAI Chat Completions `response_format` only. Anthropic,
    xAI, and DeepSeek keep text payloads — their schema fields are not wired.
    """
    if provider not in NATIVE_PROVIDERS:
        raise LlmError(f"unsupported provider {provider}")
    if provider == "anthropic":
        return (
            ANTHROPIC_URL,
            {
                "Content-Type": "application/json",
                "anthropic-version": ANTHROPIC_VERSION,
            },
            anthropic_payload(model=model, system=system, user=user),
        )
    url = {"openai": OPENAI_URL, "xai": XAI_URL, "deepseek": DEEPSEEK_URL}[provider]
    schema = json_schema if provider == "openai" else None
    return (
        url,
        {"Content-Type": "application/json"},
        openai_compat_payload(
            model=model,
            system=system,
            user=user,
            json_schema=schema,
            provider=provider,
        ),
    )


def parse_openai_compat(body: dict[str, Any], expected: str) -> ChatResult:
    if not isinstance(body, dict):
        raise LlmError("empty llm response")
    returned = str(body.get("model") or "")
    if not _model_matches(returned, expected):
        raise LlmError("response model does not match slug")
    choices = body.get("choices") or []
    if not choices or not isinstance(choices[0], dict):
        raise LlmError("empty llm response")
    message = choices[0].get("message") or {}
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise LlmError("empty llm response")
    finish = ""
    if isinstance(choices[0], dict):
        finish = str(choices[0].get("finish_reason") or "")
    return ChatResult(
        content=content,
        response_model=returned,
        cost_cents=_usage_cost_cents(body.get("usage")),
        raw=body,
        stop_reason=finish or None,
    )


def parse_anthropic(body: dict[str, Any], expected: str) -> ChatResult:
    if not isinstance(body, dict):
        raise LlmError("empty llm response")
    returned = str(body.get("model") or "")
    if not _model_matches(returned, expected):
        raise LlmError("response model does not match slug")
    blocks = body.get("content") or []
    texts: list[str] = []
    if isinstance(blocks, list):
        for block in blocks:
            if isinstance(block, dict) and block.get("type") == "text":
                texts.append(str(block.get("text") or ""))
    content = "".join(texts)
    if not content.strip():
        raise LlmError("empty llm response")
    return ChatResult(
        content=content,
        response_model=returned,
        cost_cents=None,
        raw=body,
        stop_reason=str(body.get("stop_reason") or "") or None,
    )


def is_truncated(result: ChatResult) -> bool:
    reason = (result.stop_reason or "").lower()
    return reason in {"max_tokens", "length"}


def parse_response(provider: str, body: dict[str, Any], expected: str) -> ChatResult:
    if provider == "anthropic":
        return parse_anthropic(body, expected)
    return parse_openai_compat(body, expected)


def _model_matches(returned: str, expected: str) -> bool:
    left = returned.split(":")[0].strip()
    right = expected.strip()
    if not left or not right:
        return False
    return left == right or left.startswith(right) or right in left


def _usage_cost_cents(usage: Any) -> int | None:
    if not isinstance(usage, dict) or "cost" not in usage:
        return None
    try:
        cost = float(usage["cost"])
    except (TypeError, ValueError):
        return None
    return max(0, int(round(cost * 100)))
