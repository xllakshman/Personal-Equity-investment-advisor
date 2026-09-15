"""Claim one queued analysis_requests row (SKIP LOCKED)."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg2.extensions import connection, cursor
from psycopg2.extras import RealDictCursor


def claim_queued(conn: connection) -> dict[str, Any] | None:
    cur: cursor = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """
        select id
          from analysis_requests
         where status = 'queued'
         order by accepted_at
         for update skip locked
         limit 1
        """
    )
    row = cur.fetchone()
    if not row:
        cur.close()
        return None
    request_id = row["id"]
    cur.execute("select thesis_consume_quota_for_provider(%s)", (request_id,))
    cur.execute(
        """
        select id, family_id, created_by, ticker, exchange, lenses,
               invested_amount, portfolio_size, intended_investment,
               intent, avg_down, risk_band, cagr_band, tax_residency, tax_slab,
               model_id, clarifications, status
          from analysis_requests
         where id = %s
        """,
        (request_id,),
    )
    full = cur.fetchone()
    cur.close()
    return dict(full) if full else None


def mark_failed(conn: connection, request_id: UUID | str, error_text: str) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        update analysis_requests
           set status = 'failed',
               error_text = %s,
               completed_at = now()
         where id = %s
        """,
        (error_text[:2000], request_id),
    )
    cur.close()


def set_status(conn: connection, request_id: UUID | str, status: str) -> None:
    cur = conn.cursor()
    cur.execute(
        "update analysis_requests set status = %s where id = %s",
        (status, request_id),
    )
    cur.close()
