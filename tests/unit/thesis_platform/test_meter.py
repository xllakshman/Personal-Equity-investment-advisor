"""Meter kinds must match 012 SQL and the Desk KPI filter."""
from __future__ import annotations

from thesis_platform.meter import METER_KINDS, NON_METER_KINDS, counts_against_plan


def test_search_refine_and_gate_count() -> None:
    assert METER_KINDS == ("search", "refine", "refine_gate")
    for kind in METER_KINDS:
        assert counts_against_plan(kind) is True
    for kind in NON_METER_KINDS:
        assert counts_against_plan(kind) is False


def test_prompt_extract_does_not_count() -> None:
    assert counts_against_plan("prompt_extract_attempt") is False
    assert counts_against_plan("pdf") is False
    assert counts_against_plan("") is False
