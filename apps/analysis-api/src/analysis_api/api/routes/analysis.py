"""GET /analysis/:id — status only; never prompt body."""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from psycopg2.extras import RealDictCursor

from analysis_api.api.deps import bearer_user
from analysis_api.domain.errors import public_error_text
from analysis_api.schemas.refine import AnalysisStatus
from thesis_platform.config import Settings
from thesis_platform.db import connect

router = APIRouter()


@router.get("/analysis/{request_id}", response_model=AnalysisStatus)
def get_analysis(
    request_id: str,
    authorization: str | None = Header(default=None),
) -> AnalysisStatus:
    settings = Settings.from_env()
    user = bearer_user(settings, authorization)
    conn = connect(settings)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            select ar.id::text, ar.status::text, ar.ticker, ar.error_text,
                   r.id::text as report_id
              from analysis_requests ar
              join family_members fm
                on fm.family_id = ar.family_id
               and fm.user_id = %s
               and fm.is_active = true
              left join reports r on r.request_id = ar.id
             where ar.id = %s
            """,
            (user["id"], request_id),
        )
        row = cur.fetchone()
        cur.close()
        if not row:
            raise HTTPException(status_code=404, detail="not found")
        return AnalysisStatus(
            id=row["id"],
            status=row["status"],
            ticker=row["ticker"],
            error_text=public_error_text(row["error_text"]),
            report_id=row["report_id"],
        )
    finally:
        conn.close()
