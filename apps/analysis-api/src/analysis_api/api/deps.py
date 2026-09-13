"""JWT user lookup via Supabase Auth (desk JWT)."""
from __future__ import annotations

from typing import Any

import httpx
from fastapi import Header, HTTPException

from thesis_platform.config import Settings


def bearer_user(
    settings: Settings,
    authorization: str | None,
    *,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="missing bearer token")
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_anon_key or settings.supabase_service_key,
    }
    http = client or httpx.Client(timeout=15.0)
    owns = client is None
    try:
        resp = http.get(settings.supabase_url.rstrip("/") + "/auth/v1/user", headers=headers)
    finally:
        if owns:
            http.close()
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="invalid session")
    body = resp.json()
    if not body.get("id"):
        raise HTTPException(status_code=401, detail="invalid session")
    return body
