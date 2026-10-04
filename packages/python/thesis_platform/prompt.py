"""Load promoted prompt_versions. Never expose body on HTTP."""
from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from psycopg2.extensions import cursor


def _cell(row: Any, index: int, key: str) -> Any:
    """Support default tuple cursors and RealDictCursor (dict rows)."""
    if isinstance(row, Mapping):
        return row.get(key)
    return row[index]


def load_promoted_body(cur: cursor, role: str = "advisor") -> tuple[str, str]:
    """Return (id, body) for the current promoted row of that role."""
    cur.execute(
        """
        select id::text as id, body
          from prompt_versions
         where role = %s
           and promoted_at is not null
           and superseded_at is null
         order by promoted_at desc
         limit 1
        """,
        (role,),
    )
    row = cur.fetchone()
    body = _cell(row, 1, "body") if row else None
    if not row or not body:
        raise RuntimeError(f"no promoted prompt_versions row for role={role}")
    return str(_cell(row, 0, "id")), str(body)


def leak_substring(body: str, n: int = 40) -> str:
    text = (body or "").replace("\n", " ").strip()
    if len(text) < n:
        return text
    return text[:n]
