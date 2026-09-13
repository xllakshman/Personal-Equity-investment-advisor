"""Analysis API health if the process is listening on 8091."""
from __future__ import annotations

import os

import httpx
import pytest

BASE = os.environ.get("THESIS_ANALYSIS_API", "http://127.0.0.1:8091").rstrip("/")


@pytest.mark.integration
def test_health_if_running() -> None:
    try:
        res = httpx.get(f"{BASE}/health", timeout=2.0)
    except httpx.RequestError:
        pytest.skip(f"analysis-api not reachable at {BASE}")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.integration
def test_analysis_without_bearer_is_401_if_running() -> None:
    try:
        res = httpx.get(
            f"{BASE}/analysis/00000000-0000-4000-8000-000000000000",
            timeout=2.0,
        )
    except httpx.RequestError:
        pytest.skip(f"analysis-api not reachable at {BASE}")
    assert res.status_code == 401
