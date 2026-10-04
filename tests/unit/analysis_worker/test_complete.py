"""Worker refuses inflight stage_status dumps; continues truncated JSON."""
from __future__ import annotations

from thesis_platform.native_llm import ChatResult, is_truncated
from analysis_worker.jobs.complete import _run_chat, _try_parse


def _result(content: str, stop: str | None = None) -> ChatResult:
    return ChatResult(
        content=content,
        response_model="claude-haiku-4-5",
        cost_cents=None,
        raw={"stop_reason": stop},
        stop_reason=stop,
    )


def test_try_parse_rejects_empty() -> None:
    assert _try_parse("") is None
    assert _try_parse('{"verdict":"Hold"}') == {"verdict": "Hold"}


def test_run_chat_continues_after_max_tokens() -> None:
    calls: list[str] = []

    def runner(**kw):
        calls.append(kw["user"][-20:])
        if len(calls) == 1:
            return _result('{"verdict":"Ho', "max_tokens")
        return _result('ld"}', "end_turn")

    out = _run_chat(runner, provider="anthropic", model="claude-haiku-4-5", system="s", user="u")
    assert out.content == '{"verdict":"Hold"}'
    assert len(calls) == 2


def test_is_truncated_max_tokens() -> None:
    assert is_truncated(_result("x", "max_tokens")) is True
    assert is_truncated(_result("x", "end_turn")) is False


def test_credit_error_falls_back_to_next_lab() -> None:
    from analysis_worker.jobs.complete import _run_chat_or_fallback
    from thesis_platform.config import Settings
    from thesis_platform.native_llm import LlmError

    calls: list[str] = []

    def runner(**kw):
        calls.append(kw["provider"])
        if kw["provider"] == "anthropic":
            raise LlmError("anthropic http 400: Your credit balance is too low")
        return _result("LAYER 1\nTHE BOTTOM LINE\nok", "end_turn")

    class Cur:
        def execute(self, _sql, params=None):
            self.params = params

        def fetchone(self):
            return {
                "id": "gpt56m",
                "provider": "openai",
                "provider_model_id": "gpt-5.6-luna",
                "thesis_class": "quick",
            }

    settings = Settings(
        supabase_url="https://example.supabase.co",
        supabase_db_host="db.example.supabase.co",
        supabase_db_password="x",
        anthropic_api_key="sk-ant-test",
        openai_api_key="sk-openai-test",
    )
    out, provider, native_id, used = _run_chat_or_fallback(
        runner,
        Cur(),
        settings,
        model={"id": "haiku45", "provider": "anthropic", "thesis_class": "quick"},
        provider="anthropic",
        native_id="claude-haiku-4-5",
        used_model_id="haiku45",
        system="s",
        user="u",
    )
    assert provider == "openai"
    assert native_id == "gpt-5.6-luna"
    assert used == "gpt56m"
    assert "THE BOTTOM LINE" in out.content
    assert calls == ["anthropic", "openai"]
