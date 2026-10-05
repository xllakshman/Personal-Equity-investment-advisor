import json

from thesis_platform.status import FOUND, INPUTS_MISSING, NOT_COVERED, NOT_DISCLOSED
from thesis_platform.valuation import (
    apply_guidance_extraction,
    consensus_forward_pe,
    parse_guidance_json,
    quote_contains_both,
    reverse_dcf_from_guidance,
    trailing_pe_vs_history,
    valuation_from_ctx,
)
from thesis_platform.yahoo import DailyClose, close_on_or_before
from datetime import date


def test_parse_requires_quote_with_both_numbers() -> None:
    raw = json.dumps(
        {
            "low": 6.5,
            "high": 6.8,
            "basis": "non-GAAP",
            "fiscal_year": 2026,
            "source_accession": "000-1",
            "quote": "full-year diluted EPS of $6.50 to $6.80",
        }
    )
    parsed = parse_guidance_json(raw)
    assert parsed is not None
    assert parsed["low"] == 6.5
    assert parsed["high"] == 6.8
    assert parsed["basis"] == "non-GAAP"
    missing = json.dumps(
        {
            "low": 6.5,
            "high": 6.8,
            "basis": "non-GAAP",
            "fiscal_year": 2026,
            "source_accession": "000-1",
            "quote": "we expect continued growth",
        }
    )
    assert parse_guidance_json(missing) is None
    one = json.dumps(
        {
            "low": 6.5,
            "high": 6.8,
            "basis": "GAAP",
            "fiscal_year": 2026,
            "source_accession": "000-1",
            "quote": "EPS of $6.50",
        }
    )
    assert parse_guidance_json(one) is None
    assert quote_contains_both("range $6.50-$6.80", 6.5, 6.8) is True


def test_no_guidance_is_not_disclosed_not_guessed() -> None:
    got = apply_guidance_extraction(
        json.dumps(
            {
                "low": None,
                "high": None,
                "basis": "non-GAAP",
                "fiscal_year": 2026,
                "source_accession": "000-1",
                "quote": "",
            }
        ),
        {"accession": "000-1", "text": "no EPS outlook"},
        100.0,
    )
    assert got["status"] == NOT_DISCLOSED
    assert got["pe"] is None


def test_guidance_pe_label_never_says_forward() -> None:
    raw = json.dumps(
        {
            "low": 5.0,
            "high": 5.0,
            "basis": "non-GAAP",
            "fiscal_year": 2026,
            "source_accession": "acc-9",
            "quote": "EPS guidance of $5.00",
        }
    )
    got = apply_guidance_extraction(raw, {"accession": "acc-9"}, 100.0)
    assert got["status"] == FOUND
    assert got["pe"] == 20.0
    assert got["label"] == "Guidance P/E (non-GAAP FY2026)"
    assert "Forward P/E" not in got["label"]


def test_trailing_pe_maths_and_missing_eps() -> None:
    facts = {
        "status": FOUND,
        "ttm_diluted_eps": 4.0,
        "years": [
            {"fy": 2024, "eps_diluted": 3.5, "period_end": "2024-12-31"},
            {"fy": 2023, "eps_diluted": 3.0, "period_end": "2023-12-31"},
        ],
    }
    fy_closes = [
        {"fy": 2024, "end": "2024-12-31", "close": 70.0},
        {"fy": 2023, "end": "2023-12-31", "close": 45.0},
    ]
    got = trailing_pe_vs_history(
        close=80.0, fundamentals=facts, fy_closes=fy_closes, us_listed=True
    )
    assert got["status"] == FOUND
    assert got["current_pe"] == 20.0
    assert got["ttm_diluted_eps"] == 4.0
    assert got["years"][0]["fy"] == 2024
    assert got["years"][0]["pe"] == 20.0
    assert got["years"][1]["pe"] == 15.0
    assert got["five_year_avg"] == 17.5
    assert got["premium_pct"] == round(100.0 * (20.0 - 17.5) / 17.5, 2)
    missing = trailing_pe_vs_history(
        close=80.0,
        fundamentals={"status": FOUND, "ttm_diluted_eps": None, "years": []},
        fy_closes=[],
        us_listed=True,
    )
    assert missing["status"] == INPUTS_MISSING
    nse = trailing_pe_vs_history(
        close=1500.0, fundamentals=facts, fy_closes=fy_closes, us_listed=False
    )
    assert nse["status"] == NOT_COVERED


def test_consensus_always_not_covered() -> None:
    got = consensus_forward_pe()
    assert got["status"] == NOT_COVERED
    pack = valuation_from_ctx(
        {
            "ticker": "MSFT",
            "exchange": "NASDAQ",
            "derived": {"close": 100},
            "fundamentals_annual": {"status": FOUND, "ttm_diluted_eps": 5, "years": []},
            "evidence": [],
        }
    )
    assert pack["consensus_forward_pe"]["status"] == NOT_COVERED
    assert "finnhub" not in json.dumps(pack).lower()
    assert "stockanalysis" not in json.dumps(pack).lower()


def test_nse_guidance_and_trailing_not_covered() -> None:
    pack = valuation_from_ctx(
        {
            "ticker": "HDFCBANK",
            "exchange": "NSE",
            "derived": {"close": 1500},
            "fundamentals_annual": {"status": NOT_COVERED, "years": []},
            "evidence": [],
        }
    )
    assert pack["guidance_pe"]["status"] == NOT_COVERED
    assert pack["trailing_pe_vs_history"]["status"] == NOT_COVERED
    assert pack["consensus_forward_pe"]["status"] == NOT_COVERED


def test_reverse_dcf_from_guided_eps_only() -> None:
    guidance = apply_guidance_extraction(
        json.dumps(
            {
                "low": 4.0,
                "high": 6.0,
                "basis": "GAAP",
                "fiscal_year": 2026,
                "source_accession": "a",
                "quote": "GAAP EPS $4.00 to $6.00",
            }
        ),
        {"accession": "a"},
        100.0,
    )
    table = reverse_dcf_from_guidance(guidance)
    assert table["status"] == FOUND
    assert table["used"] == "guidance_pe"
    assert table["eps_mid"] == 5.0
    assert len(table["rows"]) == 4
    nine_20 = next(
        r for r in table["rows"] if r["discount"] == 0.09 and r["exit_pe"] == 20.0
    )
    assert nine_20["value"] == round(5.0 * 20.0 / 1.09, 4)
    missing = reverse_dcf_from_guidance({"status": NOT_DISCLOSED})
    assert missing["status"] == INPUTS_MISSING
    assert missing["rows"] == []


def test_close_on_or_before_does_not_invent() -> None:
    daily = [
        DailyClose(quote_date=date(2024, 12, 30), close=70.0),
        DailyClose(quote_date=date(2025, 1, 2), close=71.0),
    ]
    assert close_on_or_before(daily, date(2024, 12, 31)) == 70.0
    assert close_on_or_before(daily, date(2024, 1, 1)) is None
