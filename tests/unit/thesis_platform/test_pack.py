from thesis_platform.pack import build_variable_pack, required_step0


def test_comprehensive_needs_yahoo_close_only() -> None:
    assert required_step0(["fundamental", "technical", "macro", "news"]) == [1]


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
    assert "derived" in raw
    assert "step0_coverage" in raw
    assert "fundamentals_annual" in raw
    assert "item2_news" in raw
    assert '"status": "NOT_COVERED"' in raw
    assert '"news_absent": false' in raw
    assert "150000" not in raw
    assert "$150,000" not in raw
    assert "AMZN" not in raw


def test_skip_clarifications_are_empty_object() -> None:
    raw = build_variable_pack({"ticker": "MSFT", "clarifications": {}})
    assert '"clarifications": {}' in raw
    assert "conviction" not in raw


def test_pack_includes_analyse_step_inputs() -> None:
    raw = build_variable_pack(
        {
            "ticker": "MSFT",
            "lenses": ["fundamental"],
            "intent": "long_term",
            "avg_down": "planned_tranches",
            "risk_band": "medium_11_20",
            "cagr_band": "medium_13_18",
            "tax_residency": "india",
            "tax_slab": "30%",
            "invested_amount": 12090,
            "portfolio_size": 35588,
            "intended_investment": 5000,
            "run_qty": 12,
            "run_cost_per_share": 100.75,
            "model_id": "opus5",
        }
    )
    assert '"invested_amount": 12090' in raw
    assert '"portfolio_size": 35588' in raw
    assert '"intended_investment": 5000' in raw
    assert '"run_qty": 12' in raw
    assert '"run_cost_per_share": 100.75' in raw
    assert '"model_id": "opus5"' in raw
    assert '"tax_residency": "india"' in raw
    assert '"lenses": ["fundamental"]' in raw


def test_pack_includes_entry_tranches() -> None:
    raw = build_variable_pack(
        {
            "ticker": "MSFT",
            "investor_profiles": {
                "tranche_t1_pct": 35,
                "tranche_t2_pct": 25,
                "tranche_t3_pct": 25,
                "tranche_t4_pct": 15,
            },
        }
    )
    assert '"tranche_t1_pct": 35' in raw
    assert '"tranche_t4_pct": 15' in raw


def test_pack_includes_companyfacts_from_evidence() -> None:
    raw = build_variable_pack(
        {
            "ticker": "MSFT",
            "evidence": [
                {
                    "step0_number": 2,
                    "query": "sec edgar companyfacts MSFT",
                    "excerpt": {
                        "status": "ok",
                        "years": [
                            {
                                "fy": 2024,
                                "revenue": 245.1,
                                "fcf": 70,
                                "net_income": 50,
                                "roic": 0.2,
                            }
                        ],
                    },
                }
            ],
        }
    )
    assert "245.1" in raw
    assert "fundamentals_annual" in raw
    assert "companyfacts" in raw
    assert '"roic_years_available": 1' in raw
    assert '"fcf_ni"' in raw


def test_pack_derived_extras_from_empty_facts() -> None:
    raw = build_variable_pack({"ticker": "HDFCBANK", "exchange": "NSE"})
    assert '"roic_years_available": 0' in raw
    assert '"fcf_ni": []' in raw
    assert '"status": "NOT_COVERED"' in raw
    assert "NOT_DISCLOSED" not in raw
