"""load_promoted_body must work with tuple cursors and RealDictCursor."""
from __future__ import annotations

import pytest

from thesis_platform.prompt import load_promoted_body


class _Cur:
    def __init__(self, row) -> None:
        self.row = row

    def execute(self, _sql: str, _params=None) -> None:
        return None

    def fetchone(self):
        return self.row


def test_tuple_cursor_returns_id_and_body() -> None:
    prompt_id, body = load_promoted_body(_Cur(("pv1", "advisor prefix")), "advisor")
    assert prompt_id == "pv1"
    assert body == "advisor prefix"


def test_dict_cursor_returns_id_and_body() -> None:
    """complete_request and FastAPI refine both use RealDictCursor."""
    prompt_id, body = load_promoted_body(
        _Cur({"id": "pv1", "body": "advisor prefix"}), "advisor"
    )
    assert prompt_id == "pv1"
    assert body == "advisor prefix"


def test_dict_cursor_does_not_keyerror_on_integer_index() -> None:
    row = {"id": "pv1", "body": "x" * 10}
    with pytest.raises(KeyError):
        _ = row[1]
    prompt_id, body = load_promoted_body(_Cur(row), "advisor")
    assert prompt_id == "pv1"
    assert body == "x" * 10


def test_missing_row_raises() -> None:
    with pytest.raises(RuntimeError, match="no promoted prompt_versions"):
        load_promoted_body(_Cur(None), "advisor")


def test_empty_body_raises() -> None:
    with pytest.raises(RuntimeError, match="no promoted prompt_versions"):
        load_promoted_body(_Cur({"id": "pv1", "body": ""}), "advisor")
