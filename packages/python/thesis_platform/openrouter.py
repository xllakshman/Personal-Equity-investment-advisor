"""OpenRouter chat completions adapter (D39)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
FORBIDDEN_MODELS = frozenset({"openrouter/auto", "openrouter/auto:nitro"})


class OpenRouterError(RuntimeError):
    pass


@dataclass(frozen=True)
class ChatResult:
    content: str
    response_model: str
    cost_cents: int | None
    raw: dict[str, Any]


def build_payload(
    *,
    model: str,
    openrouter_only: str,
    system: str,
    user: str,
) -> dict[str, Any]:
    if not model or model in FORBIDDEN_MODELS:
        raise OpenRouterError("forbidden model slug")
    if "auto" in model.lower():
        raise OpenRouterError("forbidden model slug")
    return {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "provider": {
            "allow_fallbacks": False,
            "only": [openrouter_only],
        },
        "response_format": {"type": "json_object"},
    }


def parse_response(body: dict[str, Any], expected_slug: str) -> ChatResult:
    if not isinstance(body, dict):
        raise OpenRouterError("empty openrouter response")
    returned = str(body.get("model") or "")
    if not _slug_matches(returned, expected_slug):
        raise OpenRouterError("response model does not match slug")
    choices = body.get("choices") or []
    if not choices or not isinstance(choices[0], dict):
        raise OpenRouterError("empty openrouter response")
    message = choices[0].get("message") or {}
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise OpenRouterError("empty openrouter response")
    cents = _usage_cost_cents(body.get("usage"))
    return ChatResult(
        content=content,
        response_model=returned,
        cost_cents=cents,
        raw=body,
    )


def _slug_matches(returned: str, expected: str) -> bool:
    left = returned.split(":")[0].strip()
    right = expected.strip()
    return bool(left) and left == right


def _usage_cost_cents(usage: Any) -> int | None:
    if not isinstance(usage, dict) or "cost" not in usage:
        return None
    try:
        cost = float(usage["cost"])
    except (TypeError, ValueError):
        return None
    return max(0, int(round(cost * 100)))
