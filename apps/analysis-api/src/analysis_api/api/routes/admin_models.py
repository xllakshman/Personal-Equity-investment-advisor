"""Admin-only native lab catalog refresh. Never returns prompt body."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException
from psycopg2.extras import RealDictCursor

from analysis_api.api.deps import bearer_user
from thesis_platform.config import Settings
from thesis_platform.db import connect
from thesis_platform.lab_models import collect_lab_models, upsert_lab_models

router = APIRouter()


def _require_platform_admin(settings: Settings, authorization: str | None) -> dict[str, Any]:
    user = bearer_user(settings, authorization)
    conn = connect(settings)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("select role from users where id = %s", (user["id"],))
        row = cur.fetchone()
        cur.close()
    finally:
        conn.close()
    if not row or str(row.get("role") or "") != "platform_admin":
        raise HTTPException(status_code=403, detail="platform admin required")
    return user


@router.post("/admin/models/refresh")
def refresh_lab_models(
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    settings = Settings.from_env()
    _require_platform_admin(settings, authorization)
    models, providers, skipped = collect_lab_models(settings)
    if not providers:
        raise HTTPException(
            status_code=503,
            detail="No native lab API key is set on analysis-api ("
            + ("; ".join(skipped) or "OpenAI, Anthropic, xAI, DeepSeek")
            + ").",
        )
    conn = connect(settings)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        upserted = upsert_lab_models(cur, models)
        conn.commit()
        cur.close()
    finally:
        conn.close()
    return {
        "upserted": upserted,
        "providers": providers,
        "skipped": skipped,
        "models": [
            {
                "provider": m.provider,
                "id": m.model_id,
                "label": m.label,
                "thesis_class": m.thesis_class,
                "major": m.major,
            }
            for m in models
        ],
    }
