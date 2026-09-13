"""Load promoted prompt_versions. Never expose body on HTTP."""
from __future__ import annotations

from psycopg2.extensions import cursor


def load_promoted_body(cur: cursor, role: str = "advisor") -> tuple[str, str]:
    """Return (id, body) for the current promoted row of that role."""
    cur.execute(
        """
        select id::text, body
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
    if not row or not row[1]:
        raise RuntimeError(f"no promoted prompt_versions row for role={role}")
    return str(row[0]), str(row[1])


def leak_substring(body: str, n: int = 40) -> str:
    text = (body or "").replace("\n", " ").strip()
    if len(text) < n:
        return text
    return text[:n]
