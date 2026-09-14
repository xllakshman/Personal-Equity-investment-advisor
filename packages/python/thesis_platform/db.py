"""PostgreSQL helpers (service_role / direct DB — bypasses RLS in worker and tools)."""
from __future__ import annotations

import socket
from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2.extensions import connection

from .config import Settings


def ipv4_hostaddr(host: str, port: int = 5432) -> str | None:
    """libpq tries AAAA first; DigitalOcean droplets often have no IPv6 route."""
    try:
        infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
    except OSError:
        return None
    if not infos:
        return None
    return str(infos[0][4][0])


def connect(settings: Settings) -> connection:
    host = settings.supabase_db_host
    kwargs: dict = {
        "host": host,
        "port": settings.supabase_db_port,
        "dbname": "postgres",
        "user": settings.supabase_db_user,
        "password": settings.supabase_db_password,
        "sslmode": "require",
        "connect_timeout": 20,
    }
    addr = ipv4_hostaddr(host)
    if addr:
        kwargs["hostaddr"] = addr
    return psycopg2.connect(**kwargs)


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
