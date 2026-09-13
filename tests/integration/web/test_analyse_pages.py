"""Analyse / reports route contracts (P3). Skip if Next is not listening on 3100."""

from __future__ import annotations

import os

import httpx
import pytest

BASE = os.environ.get("THESIS_WEB_BASE_URL", "http://127.0.0.1:3100").rstrip("/")


def _get(path: str) -> httpx.Response | None:
    try:
        return httpx.get(f"{BASE}{path}", timeout=5.0, follow_redirects=False)
    except httpx.RequestError:
        return None


@pytest.mark.integration
def test_analyse_without_session_redirects_to_login() -> None:
    res = _get("/analyse")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code in (302, 303, 307, 308)
    assert "/login" in res.headers.get("location", "")


@pytest.mark.integration
def test_analyse_ticker_query_without_session_still_auth_gated() -> None:
    res = _get("/analyse?ticker=MSFT")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code in (302, 303, 307, 308)
    assert "/login" in res.headers.get("location", "")


@pytest.mark.integration
def test_analyse_wait_without_session_still_auth_gated() -> None:
    res = _get("/analyse/00000000-0000-4000-8000-000000000000")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code in (302, 303, 307, 308)
    assert "/login" in res.headers.get("location", "")


@pytest.mark.integration
def test_reports_without_session_redirects_to_login() -> None:
    res = _get("/reports")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code in (302, 303, 307, 308)
    assert "/login" in res.headers.get("location", "")


@pytest.mark.integration
def test_desk_and_portfolio_still_auth_gated() -> None:
    for path in ("/desk", "/portfolio"):
        res = _get(path)
        if res is None:
            pytest.skip(f"web not reachable at {BASE}")
        assert res.status_code in (302, 303, 307, 308)
        assert "/login" in res.headers.get("location", "")
