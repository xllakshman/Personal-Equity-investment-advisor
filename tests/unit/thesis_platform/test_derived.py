from thesis_platform.derived import derived_from_ctx, derived_levels, pct_below_52w_high, step0_coverage


def test_pct_below_and_tranche_bands() -> None:
    assert pct_below_52w_high(80, 100) == 20.0
    assert pct_below_52w_high(100, 100) == 0.0
    assert pct_below_52w_high(0, 100) is None
    levels = derived_levels(close=80, high_52w=100, t1_cost=50)
    assert levels["pct_below_52w_high"] == 20.0
    assert levels["t2"]["price_low"] == 85.0
    assert levels["t2"]["price_high"] == 90.0
    assert levels["t3"]["price_low"] == 75.0
    assert levels["t4"]["price_low"] == 60.0
    assert levels["t1"] == 50
    assert levels["u1"]["price_low"] == 55.0
    assert levels["u1"]["price_high"] == 60.0
    assert levels["u2"]["price_high"] == 70.0


def test_no_t1_omits_u_bands() -> None:
    levels = derived_levels(close=80, high_52w=100, t1_cost=None)
    assert levels["u1"] is None
    assert levels["u2"] is None
    assert levels["t2"] is not None


def test_derived_from_ctx_uses_holding_cost() -> None:
    ctx = {
        "ticker": "MSFT",
        "holdings": [{"ticker": "MSFT", "cost_per_share": 40}],
        "evidence": [
            {
                "step0_number": 1,
                "excerpt": '{"close": 80, "high_52w": 100}',
            }
        ],
    }
    got = derived_from_ctx(ctx)
    assert got["t1"] == 40
    assert got["pct_below_52w_high"] == 20.0


def test_step0_coverage_marks_missing_3_to_7() -> None:
    cov = step0_coverage([{"step0_number": 1}, {"step0_number": 2}])
    assert cov["1"] == "yahoo_close"
    assert cov["2"] == "edgar"
    assert cov["3"] == "NOT_COVERED"
    assert cov["7"] == "NOT_COVERED"
