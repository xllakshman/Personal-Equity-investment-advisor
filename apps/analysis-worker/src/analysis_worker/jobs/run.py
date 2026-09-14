"""One queued job: consume quota → gather → complete → PDF."""
from __future__ import annotations

from typing import Any, Callable

from psycopg2.extensions import connection

from thesis_platform.config import Settings
from thesis_platform.native_llm import LlmError
from thesis_platform.sections import SectionsError
from thesis_platform.yahoo import YahooError

from analysis_worker.jobs.claim import claim_queued, mark_failed, set_status
from analysis_worker.jobs.complete import complete_request
from analysis_worker.jobs.gather import gather_step0, ticker_is_held
from analysis_worker.jobs.pdf import attach_pdf


def process_one(
    conn: connection,
    settings: Settings,
    *,
    fetch_close: Callable | None = None,
    complete_fn: Callable | None = None,
    render: Callable | None = None,
    uploader: Callable | None = None,
) -> dict[str, Any] | None:
    request = None
    try:
        request = claim_queued(conn)
    except Exception as exc:  # noqa: BLE001 — persist rejected from quota RPC
        conn.commit()
        return {"error": str(exc)[:500]}
    if not request:
        return None
    rid = request["id"]
    try:
        if not ticker_is_held(conn, request["family_id"], str(request["ticker"])):
            raise YahooError("THS-HOLDING-001 ticker is not on holdings for this family")
        gather_step0(conn, settings, request, fetch_close=fetch_close)
        set_status(conn, rid, "drafting")
        report_id = complete_request(
            conn, settings, request, complete_fn=complete_fn
        )
        set_status(conn, rid, "rendering")
        attach_pdf(conn, settings, report_id, render=render, uploader=uploader)
        set_status(conn, rid, "ready")
        cur = conn.cursor()
        cur.execute(
            "update analysis_requests set completed_at = now() where id = %s",
            (rid,),
        )
        cur.close()
        return {"request_id": str(rid), "report_id": str(report_id)}
    except Exception as exc:  # noqa: BLE001 — job must fail closed, not crash the loop
        if isinstance(exc, (YahooError, LlmError, SectionsError, RuntimeError)):
            mark_failed(conn, rid, str(exc))
        else:
            mark_failed(conn, rid, "worker error")
        return {"request_id": str(rid), "error": str(exc)[:500]}
