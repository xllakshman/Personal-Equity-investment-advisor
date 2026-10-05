from thesis_platform.xbrl import (
    US_STATUTORY_TAX,
    derived_from_fundamentals,
    empty_fundamentals,
    fundamentals_from_evidence,
    parse_companyfacts,
)


def _usd(fy: int, val: float, form: str = "10-K", fp: str = "FY", filed: str = "2024-08-01") -> dict:
    return {"fy": fy, "fp": fp, "form": form, "val": val, "filed": filed}


def _facts(**concepts: list[dict]) -> dict:
    us_gaap = {
        name: {"units": {"USD": rows}}
        for name, rows in concepts.items()
        if name != "EntityCommonStockSharesOutstanding"
    }
    dei: dict = {}
    if "EntityCommonStockSharesOutstanding" in concepts:
        dei["EntityCommonStockSharesOutstanding"] = {
            "units": {"shares": concepts["EntityCommonStockSharesOutstanding"]}
        }
    return {
        "entityName": "Microsoft Corporation",
        "facts": {"us-gaap": us_gaap, "dei": dei},
    }


def test_empty_and_quarterly_are_not_years() -> None:
    assert parse_companyfacts({}, "0000789019")["status"] == "NOT_COVERED"
    assert parse_companyfacts({"facts": {}}, "0000789019")["status"] == "INPUTS_MISSING"
    quarterly_only = _facts(Revenues=[_usd(2024, 100, fp="Q4")])
    assert parse_companyfacts(quarterly_only, "0000789019")["status"] == "INPUTS_MISSING"
    assert parse_companyfacts(quarterly_only, "0000789019")["years"] == []


def test_alias_revenue_and_computed_fcf_margins_roic() -> None:
    payload = _facts(
        RevenueFromContractWithCustomerExcludingAssessedTax=[_usd(2024, 1000)],
        GrossProfit=[_usd(2024, 400)],
        OperatingIncomeLoss=[_usd(2024, 200)],
        NetIncomeLoss=[_usd(2024, 80)],
        NetCashProvidedByUsedInOperatingActivities=[_usd(2024, 150)],
        PaymentsToAcquirePropertyPlantAndEquipment=[_usd(2024, -40)],
        LongTermDebt=[_usd(2024, 300)],
        CashAndCashEquivalentsAtCarryingValue=[_usd(2024, 50)],
        StockholdersEquity=[_usd(2024, 500)],
        CommonStockSharesOutstanding=[_usd(2024, 12, form="10-K")],
    )
    # shares use USD units in this fixture via CommonStockSharesOutstanding
    payload["facts"]["us-gaap"]["CommonStockSharesOutstanding"] = {
        "units": {"shares": [_usd(2024, 12)]}
    }
    got = parse_companyfacts(payload, "0000789019")
    assert got["status"] == "FOUND"
    assert got["concepts_used"]["revenue"] == (
        "RevenueFromContractWithCustomerExcludingAssessedTax"
    )
    year = got["years"][0]
    assert year["fy"] == 2024
    assert year["fcf"] == 110.0  # 150 - abs(-40)
    assert year["gp_margin"] == 0.4
    assert year["op_margin"] == 0.2
    assert year["ni_margin"] == 0.08
    invested = 500 + 300 - 50
    assert year["roic"] == round(200 * (1 - US_STATUTORY_TAX) / invested, 6)
    assert year["shares"] == 12
    assert "<html" not in str(got).lower()
    assert got["field_status"]["revenue"] == "FOUND"
    assert got["field_status"]["fcf"] == "FOUND"


def test_missing_capex_is_inputs_missing_not_fake_fcf() -> None:
    payload = _facts(
        Revenues=[_usd(2024, 1000)],
        NetCashProvidedByUsedInOperatingActivities=[_usd(2024, 150)],
    )
    got = parse_companyfacts(payload, "0000789019")
    assert got["status"] == "FOUND"
    assert got["field_status"]["capex"] == "INPUTS_MISSING"
    assert got["field_status"]["fcf"] == "INPUTS_MISSING"
    assert got["years"][0]["fcf"] is None
    assert got["years"][0]["ocf"] == 150


def test_positive_capex_still_subtracts_outflow() -> None:
    payload = _facts(
        Revenues=[_usd(2023, 200)],
        NetCashProvidedByUsedInOperatingActivities=[_usd(2023, 90)],
        PaymentsToAcquirePropertyPlantAndEquipment=[_usd(2023, 25)],
    )
    year = parse_companyfacts(payload, "1")["years"][0]
    assert year["fcf"] == 65.0


def test_roic_missing_without_equity() -> None:
    payload = _facts(
        OperatingIncomeLoss=[_usd(2022, 10)],
        LongTermDebt=[_usd(2022, 4)],
        CashAndCashEquivalentsAtCarryingValue=[_usd(2022, 1)],
    )
    year = parse_companyfacts(payload, "1")["years"][0]
    assert year["roic"] is None
    assert year["operating_income"] == 10


def test_debt_parts_sum_when_total_missing() -> None:
    payload = _facts(
        Revenues=[_usd(2021, 50)],
        LongTermDebtNoncurrent=[_usd(2021, 8)],
        DebtCurrent=[_usd(2021, 2)],
    )
    got = parse_companyfacts(payload, "1")
    assert got["concepts_used"]["debt"] == "debt_parts_sum"
    assert got["years"][0]["debt"] == 10


def test_prefers_10k_over_amendment() -> None:
    payload = _facts(
        Revenues=[
            _usd(2020, 1, form="10-K/A", filed="2021-08-01"),
            _usd(2020, 9, form="10-K", filed="2021-07-01"),
        ]
    )
    assert parse_companyfacts(payload, "1")["years"][0]["revenue"] == 9


def test_fundamentals_from_evidence_and_empty() -> None:
    packed = parse_companyfacts(
        _facts(Revenues=[_usd(2024, 3)]),
        "0000789019",
    )
    got = fundamentals_from_evidence(
        [
            {"step0_number": 2, "query": "sec edgar headlines MSFT", "excerpt": "{}"},
            {
                "step0_number": 2,
                "query": "sec edgar companyfacts MSFT",
                "excerpt": packed,
            },
        ]
    )
    assert got["years"][0]["revenue"] == 3
    assert empty_fundamentals()["status"] == "NOT_COVERED"
    assert fundamentals_from_evidence([])["status"] == "NOT_COVERED"


def test_derived_ratios_yoy_and_completeness() -> None:
    extras = derived_from_fundamentals(
        {
            "status": "ok",
            "years": [
                {
                    "fy": 2024,
                    "revenue": 1000,
                    "net_income": 80,
                    "ocf": 150,
                    "capex": -40,
                    "fcf": 110,
                    "operating_income": 200,
                    "equity": 500,
                    "debt": 300,
                    "cash": 50,
                    "roic": round(200 * (1 - US_STATUTORY_TAX) / 750, 6),
                },
                {
                    "fy": 2023,
                    "revenue": 800,
                    "net_income": 70,
                    "ocf": 120,
                    "capex": 30,
                    "fcf": 90,
                    "operating_income": 100,
                    "equity": 400,
                    "debt": 100,
                    "cash": 50,
                    "roic": round(100 * (1 - US_STATUTORY_TAX) / 450, 6),
                },
            ],
        }
    )
    assert extras["roic_years_available"] == 2
    assert extras["fcf_ni"] == [
        {"fy": 2023, "value": round(90 / 70, 6)},
        {"fy": 2024, "value": round(110 / 80, 6)},
    ]
    assert extras["ocf_ni"][0]["value"] == round(120 / 70, 6)
    assert extras["capex_revenue"] == [
        {"fy": 2023, "value": round(30 / 800, 6)},
        {"fy": 2024, "value": round(40 / 1000, 6)},
    ]
    assert extras["roic_yoy"][0]["from_fy"] == 2023
    assert extras["roic_yoy"][0]["fy"] == 2024
    assert extras["roic_incremental_direction"] == "up"
    assert extras["incremental_roic"][0]["fy"] == 2024
    nopat_delta = (200 - 100) * (1 - US_STATUTORY_TAX)
    assert extras["incremental_roic"][0]["value"] == round(nopat_delta / 300, 6)


def test_derived_skips_zero_ni_and_nonconsecutive_roic() -> None:
    extras = derived_from_fundamentals(
        {
            "status": "ok",
            "years": [
                {"fy": 2024, "net_income": 0, "fcf": 10, "ocf": 12, "roic": 0.18},
                {"fy": 2022, "net_income": 50, "fcf": 40, "ocf": 45, "roic": 0.12},
                {"fy": 2023, "net_income": None, "fcf": 8, "revenue": 0, "capex": 2},
            ],
        }
    )
    assert extras["fcf_ni"] == [{"fy": 2022, "value": round(40 / 50, 6)}]
    assert extras["ocf_ni"] == [{"fy": 2022, "value": round(45 / 50, 6)}]
    assert extras["capex_revenue"] == []
    assert extras["roic_years_available"] == 2
    assert extras["roic_by_year"] == [
        {"fy": 2022, "value": 0.12},
        {"fy": 2024, "value": 0.18},
    ]
    assert extras["roic_yoy"] == []
    assert extras["roic_incremental_direction"] is None


def test_derived_empty_and_not_covered() -> None:
    empty = derived_from_fundamentals(empty_fundamentals())
    assert empty["roic_years_available"] == 0
    assert empty["fcf_ni"] == []
    assert empty["roic_incremental_direction"] is None
    assert derived_from_fundamentals({})["roic_years_available"] == 0
    assert derived_from_fundamentals(None)["roic_years_available"] == 0
