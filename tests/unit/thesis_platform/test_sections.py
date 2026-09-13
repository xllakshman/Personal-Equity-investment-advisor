from __future__ import annotations

import pytest

from thesis_platform.sections import (
    SectionsError,
    adherence_failures,
    assert_comprehensive,
    mentions_us_options,
    parse_sections_json,
)

COMPREHENSIVE = {
    "step0": {"adherence": "YES"},
    "moat": {"adherence": "YES", "note": "roic"},
    "pre_buy": {"bear_case": "margin miss", "adherence": "YES"},
    "sizing": {},
    "profit_booking": {},
    "construction": {},
    "verdict": "Accumulate",
}


def test_comprehensive_requires_bear_case_and_moat() -> None:
    assert_comprehensive(COMPREHENSIVE, "long_term")
    bad = dict(COMPREHENSIVE)
    bad["pre_buy"] = {"adherence": "YES"}
    with pytest.raises(SectionsError, match="bear_case"):
        assert_comprehensive(bad, "long_term")
    missing_moat = dict(COMPREHENSIVE)
    del missing_moat["moat"]
    with pytest.raises(SectionsError, match="moat"):
        assert_comprehensive(missing_moat, "long_term")


def test_swing_requires_dual_sleeve() -> None:
    with pytest.raises(SectionsError, match="dual_sleeve"):
        assert_comprehensive(COMPREHENSIVE, "swing")


def test_adherence_redo_list() -> None:
    secs = dict(COMPREHENSIVE)
    secs["moat"] = {"adherence": "NO"}
    assert "moat" in adherence_failures(secs)


def test_null_and_array_are_invalid() -> None:
    with pytest.raises(SectionsError):
        parse_sections_json("null")
    with pytest.raises(SectionsError):
        parse_sections_json("[]")
    with pytest.raises(SectionsError):
        parse_sections_json("")


def test_options_mention() -> None:
    assert mentions_us_options({"verdict": "buy calls tomorrow"}) is True
    assert mentions_us_options(COMPREHENSIVE) is False
