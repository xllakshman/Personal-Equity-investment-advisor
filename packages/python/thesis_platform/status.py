"""Typed absence for Step 0 and fundamentals. Never invent NOT_DISCLOSED."""
from __future__ import annotations

from typing import Any

FOUND = "FOUND"
NOT_COVERED = "NOT_COVERED"
INPUTS_MISSING = "INPUTS_MISSING"
SOURCE_ERROR = "SOURCE_ERROR"

ABSENCE_STATUSES = frozenset({FOUND, NOT_COVERED, INPUTS_MISSING, SOURCE_ERROR})
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
