"""Shared configuration loaded from environment."""
from __future__ import annotations

import os
from dataclasses import dataclass


def resolve_db_host() -> str:
    """Postgres host for direct DB connections (migrations, worker, batch scripts).

    Priority: SUPABASE_DB_HOST → derive from SUPABASE_URL.
    No silent project fallback — a missing URL is a configuration error.
    """
    explicit = os.environ.get("SUPABASE_DB_HOST", "").strip()
    if explicit:
        return explicit

    url = os.environ.get("SUPABASE_URL", "").strip()
    if url:
        ref = url.replace("https://", "").replace("http://", "").rstrip("/")
        if ref.endswith(".supabase.co"):
            ref = ref[: -len(".supabase.co")]
        if ref:
            return f"db.{ref}.supabase.co"

    raise RuntimeError(
        "SUPABASE_DB_HOST or SUPABASE_URL is required (no default project host)",
    )


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_db_host: str
    supabase_db_password: str
    supabase_service_key: str = ""
    supabase_anon_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    xai_api_key: str = ""
    deepseek_api_key: str = ""
    market_data_user_agent: str = (
        "ThesisAdvisor/0.1 (research desk; previous-close only)"
    )
    analysis_api_port: int = 8091

    @classmethod
    def from_env(cls) -> "Settings":
        url = os.environ.get("SUPABASE_URL", "").strip()
        password = os.environ.get("SUPABASE_DB_PASSWORD", "").strip()
        if not url:
            raise RuntimeError("SUPABASE_URL is required")
        if not password:
            raise RuntimeError("SUPABASE_DB_PASSWORD is required")
        port_raw = os.environ.get("ANALYSIS_API_PORT", "8091").strip() or "8091"
        return cls(
            supabase_url=url,
            supabase_db_host=resolve_db_host(),
            supabase_db_password=password,
            supabase_service_key=os.environ.get("SUPABASE_SERVICE_KEY", "").strip(),
            supabase_anon_key=os.environ.get("SUPABASE_ANON_KEY", "").strip(),
            openai_api_key=os.environ.get("OPENAI_API_KEY", "").strip(),
            anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", "").strip(),
            xai_api_key=os.environ.get("XAI_API_KEY", "").strip(),
            deepseek_api_key=os.environ.get("DEEPSEEK_API_KEY", "").strip(),
            market_data_user_agent=os.environ.get(
                "MARKET_DATA_USER_AGENT",
                "ThesisAdvisor/0.1 (research desk; previous-close only)",
            ).strip(),
            analysis_api_port=int(port_raw),
        )

    @classmethod
    def from_db_env(cls) -> "Settings":
        """DB-only scripts (no service key required)."""
        return cls.from_env()
