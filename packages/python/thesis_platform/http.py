"""HTTP helpers for Yahoo and OpenRouter. Injected in unit tests."""
from __future__ import annotations

from typing import Any

import httpx

from .config import Settings
from .openrouter import OPENROUTER_URL, ChatResult, build_payload, parse_response
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


def complete_openrouter(
    settings: Settings,
    *,
    model: str,
    openrouter_only: str,
    system: str,
    user: str,
    client: httpx.Client | None = None,
) -> ChatResult:
    if not settings.openrouter_api_key:
        raise RuntimeError("OPENROUTER_API_KEY missing")
    payload = build_payload(
        model=model,
        openrouter_only=openrouter_only,
        system=system,
        user=user,
    )
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://thesis.local",
        "X-Title": "Thesis",
    }
    http = client or httpx.Client(timeout=120.0)
    owns = client is None
    try:
        resp = http.post(OPENROUTER_URL, json=payload, headers=headers)
        if resp.status_code >= 300:
            raise RuntimeError(f"openrouter http {resp.status_code}")
        body: Any = resp.json()
        return parse_response(body, model)
    finally:
        if owns:
            http.close()
