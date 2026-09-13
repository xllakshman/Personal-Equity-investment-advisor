"""Supabase Storage signed URLs and PDF upload (service role)."""
from __future__ import annotations

from typing import Any

import httpx

from .config import Settings


class StorageError(RuntimeError):
    pass


def pdf_object_path(family_id: str, report_id: str) -> str:
    return f"{family_id}/{report_id}.pdf"


def upload_pdf(settings: Settings, path: str, data: bytes) -> None:
    if not settings.supabase_service_key:
        raise StorageError("SUPABASE_SERVICE_KEY required to upload PDFs")
    url = settings.supabase_url.rstrip("/") + f"/storage/v1/object/report-pdfs/{path}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
    }
    resp = httpx.put(url, content=data, headers=headers, timeout=60.0)
    if resp.status_code >= 300:
        raise StorageError(f"pdf upload failed ({resp.status_code})")


def signed_pdf_url(settings: Settings, path: str, expires_in: int = 60) -> str:
    if not settings.supabase_service_key:
        raise StorageError("SUPABASE_SERVICE_KEY required for signed URLs")
    url = settings.supabase_url.rstrip("/") + "/storage/v1/object/sign/report-pdfs/" + path
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
        "Content-Type": "application/json",
    }
    resp = httpx.post(
        url,
        json={"expiresIn": expires_in},
        headers=headers,
        timeout=20.0,
    )
    if resp.status_code >= 300:
        raise StorageError(f"signed url failed ({resp.status_code})")
    body: Any = resp.json()
    signed = body.get("signedURL") or body.get("signedUrl")
    if not signed:
        raise StorageError("signed url missing")
    if str(signed).startswith("http"):
        return str(signed)
    return settings.supabase_url.rstrip("/") + "/storage/v1" + str(signed)
