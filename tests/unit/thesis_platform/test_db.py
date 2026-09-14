"""Direct Postgres connect prefers IPv4 (droplet has no IPv6 route to Supabase)."""
from __future__ import annotations

import socket
from unittest.mock import MagicMock, patch

from thesis_platform.config import Settings
from thesis_platform.db import connect, ipv4_hostaddr

SETTINGS = Settings(
    supabase_url="https://ndgvglcrkbygovlszxze.supabase.co",
    supabase_db_host="db.ndgvglcrkbygovlszxze.supabase.co",
    supabase_db_password="x",
)


def test_ipv4_hostaddr_returns_a_record() -> None:
    fake = [(None, None, None, None, ("104.18.1.1", 5432))]
    with patch("thesis_platform.db.socket.getaddrinfo", return_value=fake) as gai:
        assert ipv4_hostaddr("db.example.supabase.co") == "104.18.1.1"
        assert gai.call_args.args[2] == socket.AF_INET


def test_ipv4_hostaddr_none_when_lookup_fails() -> None:
    with patch("thesis_platform.db.socket.getaddrinfo", side_effect=OSError("no ipv4")):
        assert ipv4_hostaddr("db.example.supabase.co") is None


def test_connect_passes_hostaddr_ipv4() -> None:
    with (
        patch("thesis_platform.db.ipv4_hostaddr", return_value="1.2.3.4"),
        patch("thesis_platform.db.psycopg2.connect", return_value=MagicMock()) as conn,
    ):
        connect(SETTINGS)
    kwargs = conn.call_args.kwargs
    assert kwargs["host"] == "db.ndgvglcrkbygovlszxze.supabase.co"
    assert kwargs["hostaddr"] == "1.2.3.4"
    assert kwargs["user"] == "postgres"
    assert kwargs["port"] == 5432
    assert kwargs["sslmode"] == "require"
