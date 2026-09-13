"""PostgreSQL helpers (service_role / direct DB — bypasses RLS in worker and tools)."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2.extensions import connection

from .config import Settings


def connect(settings: Settings) -> connection:
    return psycopg2.connect(
        host=settings.supabase_db_host,
        port=5432,
        dbname="postgres",
        user="postgres",
        password=settings.supabase_db_password,
        sslmode="require",
        connect_timeout=20,
    )


@contextmanager
def db_cursor(settings: Settings) -> Generator:
    conn = connect(settings)
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
