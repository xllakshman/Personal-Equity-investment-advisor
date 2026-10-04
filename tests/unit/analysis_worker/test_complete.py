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
