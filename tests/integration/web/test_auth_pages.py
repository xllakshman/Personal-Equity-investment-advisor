"""Auth route contracts (P1-02). Skip if Next is not listening on 3100."""

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
def test_login_page_has_google_show_password_and_no_admin() -> None:
    res = _get("/login")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code == 200
    html = res.text
    assert "Welcome back" in html
    assert "Continue with Google" in html
    assert "Forgot password" in html
    assert "/signup" in html
    assert "password" in html.lower()
    assert "Admin" not in html
    assert "/admin" not in html


@pytest.mark.integration
def test_signup_page_has_locked_fields() -> None:
    res = _get("/signup")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code == 200
    html = res.text
    assert "Open your desk" in html
    assert "United States" in html
    assert "+91" in html
    assert "+1" in html
    assert "+971" in html
    assert "12+" in html
    assert "Admin" not in html


@pytest.mark.integration
def test_reset_page_renders() -> None:
    res = _get("/reset")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code == 200
    assert "Reset password" in res.text
    assert "30 minutes" in res.text


@pytest.mark.integration
def test_desk_without_session_redirects_to_login() -> None:
    res = _get("/desk")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code in (302, 303, 307, 308)
    assert "/login" in res.headers.get("location", "")


@pytest.mark.integration
def test_admin_index_redirects_to_admin_login() -> None:
    res = _get("/admin")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code in (302, 303, 307, 308)
    assert "/admin/login" in res.headers.get("location", "")


@pytest.mark.integration
def test_admin_login_is_not_the_desk() -> None:
    res = _get("/admin/login")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code == 200
    assert "Platform admin" in res.text
    assert "Welcome back" not in res.text
    assert "New analysis" not in res.text


@pytest.mark.integration
def test_marketing_home_still_renders() -> None:
    res = _get("/")
    if res is None:
        pytest.skip(f"web not reachable at {BASE}")
    assert res.status_code == 200
    assert "An institutional-grade AI agent built to" in res.text
