from __future__ import annotations

import pytest

from thesis_platform.sections import (
    SectionsError,
    adherence_failures,
    assert_comprehensive,
    assert_finished_note,
    is_inflight_sections,
    mentions_us_options,
    note_document,
    parse_note_payload,
    parse_sections_json,
    strip_progress_keys,
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


def test_fenced_and_preamble_json_parse() -> None:
    body = '{"verdict":"Hold","pre_buy":{"bear_case":"x"}}'
    assert parse_sections_json(f"```json\n{body}\n```")["verdict"] == "Hold"
    assert parse_sections_json("Here is the note:\n" + body)["verdict"] == "Hold"


def test_options_mention() -> None:
    assert mentions_us_options({"verdict": "buy calls tomorrow"}) is True
    assert mentions_us_options(COMPREHENSIVE) is False


def test_inflight_stage_status_is_not_a_finished_note() -> None:
    inflight = {
        "stage_status": {"stage_1_data_acquisition": "IN_PROGRESS"},
        "retrieval_1_price_and_cap": {"status": "COMPLETE", "current_price": 728.08},
    }
    assert is_inflight_sections(inflight) is True
    with pytest.raises(SectionsError, match="inflight"):
        assert_finished_note(inflight, "long_term")
    assert strip_progress_keys(inflight) == {}
    assert_finished_note(COMPREHENSIVE, "long_term")


def test_analysis_initiated_dump_is_inflight() -> None:
    dump = {
        "error": None,
        "market": "US",
        "status": "ANALYSIS_INITIATED",
        "ticker": "META",
        "message": "Meta Platforms (META) analysis initiated. Current price: $728",
    }
    assert is_inflight_sections(dump) is True
    with pytest.raises(SectionsError, match="inflight"):
        assert_finished_note(dump, "long_term")


def test_longform_plain_language_is_a_finished_note() -> None:
    raw = (
        "LAYER 1  —  PLAIN LANGUAGE\n"
        "THE BOTTOM LINE\n"
        "Whether Meta is worth holding depends on capex.\n"
        "WHAT THIS COMPANY DOES\n"
        "Meta sells advertising on Facebook and Instagram.\n"
        "IS IT A GOOD BUSINESS?\n"
        "Returns on old capital are high; new capital is not yet.\n"
        "WHAT COULD GO WRONG\n"
        "AI spending stays permanent and margins settle near 20%.\n"
        "NOT ADVICE\n"
        "Research output, not a recommendation.\n"
        "MACHINE-READABLE BLOCK\n"
        '{"ticker":"META","classification":"MONITOR","moat":"CONFIRMED"}\n'
        "END OF ANALYSIS\n"
    )
    sections = parse_note_payload(raw)
    assert sections["verdict"] == "Monitor"
    assert "THE BOTTOM LINE" in note_document(sections)
    assert_finished_note(sections, "long_term")
    assert is_inflight_sections(sections) is False
