"""Portfolio route contracts (P2-00). Skip if Next is not listening on 3100."""

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
def test_portfolio_without_session_redirects_to_login() -> None:
    res = _get("/portfolio")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code in (302, 303, 307, 308)
    assert "/login" in res.headers.get("location", "")


@pytest.mark.integration
def test_portfolio_add_query_without_session_still_auth_gated() -> None:
    res = _get("/portfolio?add=ZZZZ")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code in (302, 303, 307, 308)
    assert "/login" in res.headers.get("location", "")


@pytest.mark.integration
def test_desk_route_unchanged_without_session() -> None:
    res = _get("/desk")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code in (302, 303, 307, 308)
    assert "/login" in res.headers.get("location", "")
