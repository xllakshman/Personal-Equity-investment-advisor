"""Profile route contracts (P1-05). Skip if Next is not listening on 3100."""

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
def test_profile_without_session_redirects_to_login() -> None:
    res = _get("/settings/profile")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code in (302, 303, 307, 308)
    assert "/login" in res.headers.get("location", "")


@pytest.mark.integration
def test_desk_nav_contract_unchanged_on_login() -> None:
    res = _get("/login")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code == 200
    assert "Welcome back" in res.text
    assert "New analysis" not in res.text
