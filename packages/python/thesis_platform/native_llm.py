"""Native lab chat completions (OpenAI, Anthropic, xAI, DeepSeek). No OpenRouter."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from thesis_platform.config import Settings

NATIVE_PROVIDERS = frozenset({"openai", "anthropic", "xai", "deepseek"})
FORBIDDEN_MODELS = frozenset({"openrouter/auto", "openrouter/auto:nitro"})

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
XAI_URL = "https://api.x.ai/v1/chat/completions"
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
ANTHROPIC_VERSION = "2023-06-01"
ANTHROPIC_MAX_TOKENS = 8192


class LlmError(RuntimeError):
    pass


@dataclass(frozen=True)
class ChatResult:
    content: str
    response_model: str
    cost_cents: int | None
    raw: dict[str, Any]


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


def assert_model_allowed(model: str) -> None:
    if not model or model in FORBIDDEN_MODELS:
        raise LlmError("forbidden model slug")
    if "auto" in model.lower() or "/" in model:
        raise LlmError("forbidden model slug")


def openai_compat_payload(*, model: str, system: str, user: str) -> dict[str, Any]:
    assert_model_allowed(model)
    return {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
    }


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
        "messages": [{"role": "user", "content": user}],
    }


def request_spec(provider: str, *, model: str, system: str, user: str) -> tuple[str, dict[str, str], dict[str, Any]]:
    """URL, headers (without auth), JSON body."""
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
    return (
        url,
        {"Content-Type": "application/json"},
        openai_compat_payload(model=model, system=system, user=user),
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
    return ChatResult(
        content=content,
        response_model=returned,
        cost_cents=_usage_cost_cents(body.get("usage")),
        raw=body,
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
    )


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
