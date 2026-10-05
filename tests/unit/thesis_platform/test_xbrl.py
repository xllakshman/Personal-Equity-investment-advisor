from thesis_platform.xbrl import (
    US_STATUTORY_TAX,
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


def test_empty_and_quarterly_are_not_covered() -> None:
    assert parse_companyfacts({}, "0000789019")["status"] == "NOT_COVERED"
    assert parse_companyfacts({"facts": {}}, "0000789019")["years"] == []
    quarterly_only = _facts(Revenues=[_usd(2024, 100, fp="Q4")])
    assert parse_companyfacts(quarterly_only, "0000789019")["status"] == "NOT_COVERED"


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
    assert got["status"] == "ok"
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
