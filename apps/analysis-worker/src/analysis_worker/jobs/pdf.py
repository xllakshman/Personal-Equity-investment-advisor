"""Playwright PDF attach after a finished Analyse job (D38 / P4-03)."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg2.extensions import connection
from psycopg2.extras import RealDictCursor

from thesis_platform.config import Settings
from thesis_platform.pdf import html_to_pdf_bytes, refresh_stored_pdf, render_pdf_html
from thesis_platform.storage import pdf_object_path

__all__ = ["attach_pdf", "html_to_pdf_bytes", "render_pdf_html"]


def _evidence_rows(cur, request_id: Any) -> list[dict[str, Any]]:
    if not request_id:
        return []
    cur.execute(
        """
        select step0_number, query, excerpt
          from analysis_evidence
         where request_id = %s
         order by step0_number
        """,
        (request_id,),
    )
    return [dict(r) for r in (cur.fetchall() or [])]


def attach_pdf(
    conn: connection,
    settings: Settings,
    report_id: UUID | str,
    *,
    render: Any | None = None,
    uploader: Any | None = None,
) -> str:
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """
        select id, family_id, request_id, ticker, name, verdict, conviction,
               sections, charts, created_at
          from reports
         where id = %s
        """,
        (report_id,),
    )
    report = cur.fetchone()
    if not report:
        raise RuntimeError("report not found")
    payload = dict(report)
    evidence = _evidence_rows(cur, payload.get("request_id"))
    payload["evidence"] = evidence
    payload["evidence_excerpt"] = (
        str(evidence[0].get("excerpt") or "") if evidence else None
    ) or None
    path = pdf_object_path(str(payload["family_id"]), str(payload["id"]))
    refresh_stored_pdf(
        settings,
        payload,
        object_key=path,
        render=render,
        uploader=uploader,
    )
    cur.execute(
        "update reports set pdf_key = %s where id = %s",
        (path, report_id),
    )
    cur.close()
    return path
