"""Sunday weekly digest job (P8-02). Does not send email. sent_at stays null."""
from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection
from psycopg2.extras import Json, RealDictCursor

from thesis_platform.config import Settings


class DigestError(RuntimeError):
    pass


def iso_week_start(d: date) -> date:
    return date.fromisocalendar(d.isocalendar().year, d.isocalendar().week, 1)


def run_weekly_digest(
    conn: connection,
    settings: Settings,
    family_id: UUID | str,
    week_start: date,
    *,
    force_model_id: str | None = None,
) -> dict[str, Any]:
    """Insert one weekly_digests row. No email HTTP. Quota kinds ignore weekly_digest."""
    del settings
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """
        select f.weekly_digest_opt_in, p.weekly_digest_ticker_limit, p.slug
          from families f
          join plans p on p.id = f.plan_id
         where f.id = %s
        """,
        (str(family_id),),
    )
    fam = cur.fetchone()
    if not fam or not fam["weekly_digest_opt_in"]:
        return {"skipped": True, "reason": "opt_in_false"}

    model_id = force_model_id or "gpt56m"
    cur.execute(
        """
        select id, thesis_class, is_refine_gate
          from model_catalog
         where id = %s and is_active = true
        """,
        (model_id,),
    )
    model = cur.fetchone()
    if (
        not model
        or str(model.get("thesis_class") or "") != "quick"
        or not model.get("is_refine_gate")
    ):
        raise DigestError("weekly digest requires quick refine-gate model")

    cap = int(fam["weekly_digest_ticker_limit"] or 3)
    cur.execute(
        """
        select ticker, qty, cost_per_share, native_currency
          from holdings
         where family_id = %s
        """,
        (str(family_id),),
    )
    holdings = [dict(r) for r in (cur.fetchall() or [])]
    ranked = sorted(
        holdings,
        key=lambda h: float(h.get("qty") or 0) * float(h.get("cost_per_share") or 0),
        reverse=True,
    )[:cap]
    tickers = [str(h["ticker"]) for h in ranked]
    body = {
        "names": [
            {
                "ticker": h["ticker"],
                "qty": h["qty"],
                "cost_per_share": h["cost_per_share"],
                "changed": "Step 0 items 2–7 have no vendor.",
                "next": f"open /analyse?ticker={h['ticker']} for a full note",
            }
            for h in ranked
        ]
    }
    cur.execute(
        """
        insert into weekly_digests (
          family_id, week_start, ticker_ids, body, model_id, cost_cents, sent_at
        ) values (%s, %s, %s, %s, %s, 0, null)
        on conflict (family_id, week_start) do nothing
        returning id
        """,
        (str(family_id), week_start, tickers, Json(body), model_id),
    )
    row = cur.fetchone()
    if not row:
        return {"skipped": True, "reason": "already_exists"}
    cur.execute(
        """
        insert into usage_events (
          family_id, user_id, kind, model_id, cost_cents, billing_period
        )
        select %s, f.created_by, 'weekly_digest'::usage_kind, %s, 0, thesis_billing_period_start()
          from families f
         where f.id = %s
        """,
        (str(family_id), model_id, str(family_id)),
    )
    cur.close()
    return {"skipped": False, "id": str(row["id"]), "tickers": tickers}
