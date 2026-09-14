"""HTTP helpers for Yahoo and native lab LLMs. Injected in unit tests."""
from __future__ import annotations

from typing import Any

import httpx

from .config import Settings
from .native_llm import ChatResult, LlmError, parse_response, request_spec, require_api_key
from .yahoo import YahooError, chart_url, parse_previous_close, PreviousClose


def fetch_yahoo_chart(
    settings: Settings,
    symbol: str,
    *,
    client: httpx.Client | None = None,
) -> PreviousClose:
    headers = {"User-Agent": settings.market_data_user_agent}
    http = client or httpx.Client(timeout=20.0)
    owns = client is None
    try:
        resp = http.get(chart_url(symbol), headers=headers)
        if resp.status_code != 200:
            raise YahooError(f"yahoo http {resp.status_code}")
        try:
            payload = resp.json()
        except ValueError as exc:
            raise YahooError("empty yahoo chart") from exc
        if not payload:
            raise YahooError("empty yahoo chart")
        return parse_previous_close(payload, symbol)
    finally:
        if owns:
            http.close()


def complete_chat(
    settings: Settings,
    *,
    provider: str,
    model: str,
    system: str,
    user: str,
    client: httpx.Client | None = None,
) -> ChatResult:
    key = require_api_key(settings, provider)
    url, headers, payload = request_spec(provider, model=model, system=system, user=user)
    if provider == "anthropic":
        headers = {**headers, "x-api-key": key}
    else:
        headers = {**headers, "Authorization": f"Bearer {key}"}
    http = client or httpx.Client(timeout=120.0)
    owns = client is None
    try:
        resp = http.post(url, json=payload, headers=headers)
        if resp.status_code >= 300:
            raise LlmError(f"{provider} http {resp.status_code}")
        try:
            body: Any = resp.json()
        except ValueError as exc:
            raise LlmError("empty llm response") from exc
        return parse_response(provider, body, model)
    finally:
        if owns:
            http.close()
