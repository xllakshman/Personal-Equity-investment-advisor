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
    SUBMISSIONS_URL,
    cik_from_tickers_map,
    empty_exhibit,
    empty_pack,
    exhibit_99_1_name,
    exhibit_index_url,
    filing_archive_url,
    filer_type_from_submissions,
    latest_earnings_8k,
    parse_submissions_headlines,
    strip_filing_html,
)
from .status import (
    FOUND,
    INPUTS_MISSING,
    NOT_COVERED,
    NOT_DISCLOSED,
    SOURCE_ERROR,
    is_found,
    normalize_status,
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
_SUBMISSIONS_CACHE: dict[str, Any] = {}
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
    range: str = "1y",
    client: httpx.Client | None = None,
) -> YahooChartPack:
    headers = {"User-Agent": settings.market_data_user_agent}
    http = client or httpx.Client(timeout=20.0)
    owns = client is None
    try:
        resp = http.get(chart_url(symbol, range), headers=headers)
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
    """US-listed only. NSE/BSE → NOT_COVERED. HTTP miss → SOURCE_ERROR. Empty 8-K/10-Q/10-K after 200 → FOUND."""
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
        if not mapping:
            return empty_pack(SOURCE_ERROR)
        cik = cik_from_tickers_map(mapping, ticker)
        if not cik:
            return empty_pack(NOT_COVERED)
        payload = _submissions(http, headers, cik)
        if not payload:
            return empty_pack(SOURCE_ERROR)
        filings = parse_submissions_headlines(payload, cik)
        pack: dict[str, Any] = {"status": FOUND, "filings": filings}
        filer = filer_type_from_submissions(payload)
        if filer:
            pack["filer_type"] = filer
        return pack
    except httpx.HTTPError:
        return empty_pack(SOURCE_ERROR)
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
    """US-listed annual XBRL. NSE → NOT_COVERED. HTTP miss → SOURCE_ERROR. Never fails the Analyse job."""
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
        if not mapping:
            return empty_fundamentals(SOURCE_ERROR)
        cik = cik_from_tickers_map(mapping, ticker)
        if not cik:
            return empty_fundamentals(NOT_COVERED)
        time.sleep(_EDGAR_GAP_SEC)
        resp = http.get(COMPANYFACTS_URL.format(cik=cik), headers=headers)
        if resp.status_code != 200:
            return empty_fundamentals(SOURCE_ERROR)
        try:
            payload = resp.json()
        except ValueError:
            return empty_fundamentals(SOURCE_ERROR)
        parsed = parse_companyfacts(payload, cik)
        status = parsed.get("status")
        if is_found(status) and parsed.get("years"):
            return parsed
        if normalize_status(status) == INPUTS_MISSING:
            return parsed
        if parsed.get("years"):
            return parsed
        return empty_fundamentals(INPUTS_MISSING)
    except httpx.HTTPError:
        return empty_fundamentals(SOURCE_ERROR)
    finally:
        if owns:
            http.close()


def fetch_edgar_earnings_exhibit(
    settings: Settings,
    ticker: str,
    exchange: str | None,
    *,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """Latest 8-K Exhibit 99.1 text for US names. NSE → NOT_COVERED. No analyst fill."""
    if not is_us_listed(ticker, exchange):
        return empty_exhibit(NOT_COVERED)
    headers = {
        "User-Agent": settings.market_data_user_agent,
        "Accept": "application/json, text/html, */*",
    }
    http = client or httpx.Client(timeout=20.0)
    owns = client is None
    try:
        mapping = _company_tickers(http, headers)
        if not mapping:
            return empty_exhibit(SOURCE_ERROR)
        cik = cik_from_tickers_map(mapping, ticker)
        if not cik:
            return empty_exhibit(NOT_COVERED)
        payload = _submissions(http, headers, cik)
        if not payload:
            return empty_exhibit(SOURCE_ERROR)
        eightk = latest_earnings_8k(payload, cik)
        if not eightk or not eightk.get("accession"):
            return empty_exhibit(NOT_DISCLOSED)
        time.sleep(_EDGAR_GAP_SEC)
        index_url = exhibit_index_url(cik, eightk["accession"])
        idx_resp = http.get(index_url, headers=headers)
        if idx_resp.status_code != 200:
            return empty_exhibit(SOURCE_ERROR if idx_resp.status_code >= 500 else NOT_DISCLOSED)
        try:
            index_payload = idx_resp.json()
        except ValueError:
            return empty_exhibit(SOURCE_ERROR)
        name = exhibit_99_1_name(index_payload)
        if not name:
            return empty_exhibit(NOT_DISCLOSED)
        time.sleep(_EDGAR_GAP_SEC)
        doc_url = filing_archive_url(cik, eightk["accession"], name)
        doc_headers = {
            "User-Agent": settings.market_data_user_agent,
            "Accept": "text/html, text/plain, */*",
        }
        doc = http.get(doc_url, headers=doc_headers)
        if doc.status_code != 200:
            if doc.status_code >= 500:
                return empty_exhibit(SOURCE_ERROR)
            return empty_exhibit(NOT_DISCLOSED)
        text = strip_filing_html(doc.text or "")
        if not text:
            return empty_exhibit(NOT_DISCLOSED)
        return {
            "status": FOUND,
            "accession": eightk["accession"],
            "filed": eightk.get("filed"),
            "url": doc_url,
            "text": text,
        }
    except httpx.HTTPError:
        return empty_exhibit(SOURCE_ERROR)
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


def _submissions(http: httpx.Client, headers: dict[str, str], cik: str) -> dict[str, Any]:
    cached = _SUBMISSIONS_CACHE.get(cik)
    if isinstance(cached, dict) and cached:
        return cached
    time.sleep(_EDGAR_GAP_SEC)
    resp = http.get(SUBMISSIONS_URL.format(cik=cik), headers=headers)
    if resp.status_code != 200:
        return {}
    try:
        payload = resp.json()
    except ValueError:
        return {}
    if isinstance(payload, dict) and payload:
        _SUBMISSIONS_CACHE[cik] = payload
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
