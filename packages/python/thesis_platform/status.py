"""Typed absence for Step 0, fundamentals, and EPS guidance."""
from __future__ import annotations

from typing import Any

FOUND = "FOUND"
NOT_COVERED = "NOT_COVERED"
INPUTS_MISSING = "INPUTS_MISSING"
SOURCE_ERROR = "SOURCE_ERROR"
# Company did not disclose EPS guidance in the 8-K. Never use this for skipped NSE coverage.
NOT_DISCLOSED = "NOT_DISCLOSED"

ABSENCE_STATUSES = frozenset(
    {FOUND, NOT_COVERED, INPUTS_MISSING, SOURCE_ERROR, NOT_DISCLOSED}
)
_FOUND_ALIASES = frozenset({FOUND, "ok", "OK"})


def normalize_status(raw: Any) -> str | None:
    text = str(raw or "").strip()
    if not text:
        return None
    if text in _FOUND_ALIASES:
        return FOUND
    if text in ABSENCE_STATUSES:
        return text
    return None


def is_found(raw: Any) -> bool:
    return normalize_status(raw) == FOUND


def is_source_error(raw: Any) -> bool:
    return normalize_status(raw) == SOURCE_ERROR
