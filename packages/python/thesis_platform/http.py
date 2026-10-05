"""HTTP helpers for Yahoo, SEC EDGAR, and native lab LLMs. Injected in unit tests."""
from __future__ import annotations

import time
from typing import Any

import httpx

from .config import Settings
from .xbrl import (
    COMPANYFACTS_URL,
    empty_fundamentals,
    parse_companyfacts,
)
from .edgar import (
    COMPANY_TICKERS_URL,
    NOT_COVERED,
    SUBMISSIONS_URL,
    cik_from_tickers_map,
    empty_pack,
    parse_submissions_headlines,
)
from .native_llm import ChatResult, LlmError, parse_response, request_spec, require_api_key
from .yahoo import (
    YahooError,
    YahooChartPack,
    chart_url,
    is_us_listed,
    parse_yahoo_chart_pack,
    PreviousClose,
)

_TICKER_MAP_CACHE: dict[str, Any] | None = None
_EDGAR_GAP_SEC = 0.11


def fetch_yahoo_chart(
    settings: Settings,
    symbol: str,
    *,
    client: httpx.Client | None = None,
) -> PreviousClose:
    return fetch_yahoo_chart_pack(settings, symbol, client=client).previous


def fetch_yahoo_chart_pack(
    settings: Settings,
    symbol: str,
    *,
    client: httpx.Client | None = None,
) -> YahooChartPack:
    headers = {"User-Agent": settings.market_data_user_agent}
    http = client or httpx.Client(timeout=20.0)
    owns = client is None
    try:
        resp = http.get(chart_url(symbol, "1y"), headers=headers)
        if resp.status_code != 200:
            raise YahooError(f"yahoo http {resp.status_code}")
        try:
            payload = resp.json()
        except ValueError as exc:
            raise YahooError("empty yahoo chart") from exc
        if not payload:
            raise YahooError("empty yahoo chart")
        return parse_yahoo_chart_pack(payload, symbol)
    finally:
        if owns:
            http.close()


def fetch_edgar_headlines(
    settings: Settings,
    ticker: str,
    exchange: str | None,
    *,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """US-listed only. Never raises into a failed Analyse job; NOT_COVERED otherwise."""
    if not is_us_listed(ticker, exchange):
        return empty_pack(NOT_COVERED)
    headers = {
        "User-Agent": settings.market_data_user_agent,
        "Accept": "application/json",
    }
    http = client or httpx.Client(timeout=20.0)
    owns = client is None
    try:
        mapping = _company_tickers(http, headers)
        cik = cik_from_tickers_map(mapping, ticker)
        if not cik:
            return empty_pack(NOT_COVERED)
        time.sleep(_EDGAR_GAP_SEC)
        resp = http.get(SUBMISSIONS_URL.format(cik=cik), headers=headers)
        if resp.status_code != 200:
            return empty_pack(NOT_COVERED)
        try:
            payload = resp.json()
        except ValueError:
            return empty_pack(NOT_COVERED)
        filings = parse_submissions_headlines(payload, cik)
        if not filings:
            return empty_pack(NOT_COVERED)
        return {"status": "ok", "filings": filings}
    except httpx.HTTPError:
        return empty_pack(NOT_COVERED)
    finally:
        if owns:
            http.close()


def fetch_edgar_companyfacts(
    settings: Settings,
    ticker: str,
    exchange: str | None,
    *,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """US-listed annual XBRL. Miss → NOT_COVERED; never fails the Analyse job."""
    if not is_us_listed(ticker, exchange):
        return empty_fundamentals(NOT_COVERED)
    headers = {
        "User-Agent": settings.market_data_user_agent,
        "Accept": "application/json",
    }
    http = client or httpx.Client(timeout=20.0)
    owns = client is None
    try:
        mapping = _company_tickers(http, headers)
        cik = cik_from_tickers_map(mapping, ticker)
        if not cik:
            return empty_fundamentals(NOT_COVERED)
        time.sleep(_EDGAR_GAP_SEC)
        resp = http.get(COMPANYFACTS_URL.format(cik=cik), headers=headers)
        if resp.status_code != 200:
            return empty_fundamentals(NOT_COVERED)
        try:
            payload = resp.json()
        except ValueError:
            return empty_fundamentals(NOT_COVERED)
        parsed = parse_companyfacts(payload, cik)
        if str(parsed.get("status") or "") != "ok" or not parsed.get("years"):
            return empty_fundamentals(NOT_COVERED)
        return parsed
    except httpx.HTTPError:
        return empty_fundamentals(NOT_COVERED)
    finally:
        if owns:
            http.close()


def _company_tickers(http: httpx.Client, headers: dict[str, str]) -> dict[str, Any]:
    global _TICKER_MAP_CACHE
    if isinstance(_TICKER_MAP_CACHE, dict) and _TICKER_MAP_CACHE:
        return _TICKER_MAP_CACHE
    resp = http.get(COMPANY_TICKERS_URL, headers=headers)
    if resp.status_code != 200:
        return {}
    try:
        payload = resp.json()
    except ValueError:
        return {}
    if isinstance(payload, dict) and payload:
        _TICKER_MAP_CACHE = payload
        return payload
    return {}


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
    http = client or httpx.Client(timeout=300.0)
    owns = client is None
    try:
        resp = http.post(url, json=payload, headers=headers)
        if resp.status_code >= 300:
            raise LlmError(f"{provider} http {resp.status_code}: {_http_error_detail(resp)}")
        try:
            body: Any = resp.json()
        except ValueError as exc:
            raise LlmError("empty llm response") from exc
        return parse_response(provider, body, model)
    finally:
        if owns:
            http.close()


def _http_error_detail(resp: httpx.Response) -> str:
    """Lab error message only. Never include request prompt or report body."""
    try:
        data: Any = resp.json()
    except ValueError:
        return (resp.text or "")[:120]
    err = data.get("error") if isinstance(data, dict) else None
    if isinstance(err, dict):
        return str(err.get("message") or err.get("type") or "")[:180]
    if isinstance(err, str):
        return err[:180]
    if isinstance(data, dict) and data.get("message"):
        return str(data["message"])[:180]
    return (resp.text or "")[:120]
