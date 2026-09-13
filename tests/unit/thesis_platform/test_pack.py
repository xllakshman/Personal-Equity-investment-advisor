from thesis_platform.pack import build_variable_pack, required_step0


def test_comprehensive_needs_all_seven() -> None:
    assert required_step0(["fundamental", "technical", "macro", "news"]) == [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
    ]


def test_fundamental_technical_only_needs_close() -> None:
    assert required_step0(["fundamental", "technical"]) == [1]


def test_pack_has_no_maya_book_defaults() -> None:
    raw = build_variable_pack(
        {
            "ticker": "MSFT",
            "holdings": [{"ticker": "MSFT", "qty": 1}],
            "evidence": [{"step0_number": 1, "excerpt": '{"close": 412.5}'}],
        }
    )
    assert "MSFT" in raw
    assert "150000" not in raw
    assert "$150,000" not in raw
    assert "AMZN" not in raw


def test_skip_clarifications_are_empty_object() -> None:
    raw = build_variable_pack({"ticker": "MSFT", "clarifications": {}})
    assert '"clarifications": {}' in raw
    assert "conviction" not in raw


def test_empty_ticker_and_unknown_lenses() -> None:
    assert required_step0([]) == [1]
    assert required_step0(["tax", "vibes"]) == [1]
