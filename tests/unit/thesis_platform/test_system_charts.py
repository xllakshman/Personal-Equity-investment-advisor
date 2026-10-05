from thesis_platform.charts import system_charts_from_ctx
from thesis_platform.derived import derived_levels
from thesis_platform.typeset import parse_charts
from thesis_platform.xbrl import empty_fundamentals


def test_system_charts_line_and_table_no_pie() -> None:
    ctx = {
        "evidence": [
            {
                "step0_number": 1,
                "excerpt": (
                    '{"close": 80, "high_52w": 100, "quote_date": "2026-02-28", "monthly_closes": ['
                    '{"date": "2026-01-31", "close": 90},'
                    '{"date": "2026-02-28", "close": 80}]}'
                ),
            }
        ]
    }
    derived = derived_levels(close=80, high_52w=100, t1_cost=50)
    charts = system_charts_from_ctx(ctx, derived)
    assert "price_vs_tranches" in charts
    assert charts["price_vs_tranches"]["type"] == "line"
    assert len(charts["price_vs_tranches"]["values"]) == 2
    assert charts["tranche_levels"]["type"] == "table"
    assert "roic_history" not in charts
    assert "cash_conversion" not in charts
    parsed, dropped = parse_charts(charts)
    assert dropped == []
    kinds = {c["type"] for c in parsed}
    assert "line" in kinds
    assert "table" in kinds
    assert "pie" not in kinds
    assert charts["price_vs_tranches"]["source"] == "Yahoo Finance chart v8"
    assert charts["price_vs_tranches"]["as_of"] == "2026-02-28"
    assert charts["tranche_levels"]["source"] == "Yahoo Finance chart v8 + book cost"
    assert charts["tranche_levels"]["as_of"] == "2026-02-28"
    pie, dropped_pie = parse_charts({"x": {"type": "pie", "title": "seg"}})
    assert pie == []
    assert "pie" in dropped_pie


def test_empty_fundamentals_omit_roic_and_cash_charts() -> None:
    derived = derived_levels(close=80, high_52w=100, t1_cost=None)
    charts = system_charts_from_ctx(
        {"fundamentals_annual": empty_fundamentals(), "evidence": []},
        derived,
    )
    assert "roic_history" not in charts
    assert "cash_conversion" not in charts


def test_nse_not_covered_has_no_fake_roic_chart() -> None:
    derived = {
        **derived_levels(close=1500, high_52w=1600, t1_cost=None),
        "roic_years_available": 0,
        "fcf_ni": [],
        "ocf_ni": [],
        "roic_by_year": [],
    }
    charts = system_charts_from_ctx(
        {
            "fundamentals_annual": empty_fundamentals(),
            "evidence": [
                {
                    "step0_number": 1,
                    "excerpt": (
                        '{"close": 1500, "high_52w": 1600, "monthly_closes": ['
                        '{"date": "2026-01-31", "close": 1480},'
                        '{"date": "2026-02-28", "close": 1500}]}'
                    ),
                }
            ],
        },
        derived,
    )
    assert "price_vs_tranches" in charts
    assert "roic_history" not in charts
    assert "cash_conversion" not in charts


def test_us_facts_write_roic_and_cash_bars_not_html() -> None:
    derived = {
        **derived_levels(close=80, high_52w=100, t1_cost=50),
        "roic_years_available": 2,
        "roic_by_year": [{"fy": 2023, "value": 0.12}, {"fy": 2024, "value": 0.18}],
        "fcf_ni": [{"fy": 2024, "value": 1.375}],
        "ocf_ni": [{"fy": 2024, "value": 1.875}],
        "roic_yoy": [{"fy": 2024, "from_fy": 2023, "delta": 0.06}],
        "roic_incremental_direction": "up",
    }
    charts = system_charts_from_ctx({"evidence": []}, derived)
    assert charts["roic_history"]["type"] == "bar"
    assert charts["roic_history"]["reference"] == 15
    assert charts["roic_history"]["unit"] == "%"
    assert charts["roic_history"]["labels"] == ["2023", "2024"]
    assert charts["roic_history"]["values"] == [12.0, 18.0]
    assert charts["roic_history"]["source"] == "SEC companyfacts"
    assert charts["roic_history"]["as_of"] == "FY 2024"
    assert charts["cash_conversion"]["type"] == "bar"
    assert charts["cash_conversion"]["source"] == "SEC companyfacts"
    assert charts["cash_conversion"]["as_of"] == "FY 2024"
    assert charts["cash_conversion"]["reference"] == 80
    assert "2024 FCF/NI" in charts["cash_conversion"]["labels"]
    assert "2024 OCF/NI" in charts["cash_conversion"]["labels"]
    parsed, dropped = parse_charts(charts)
    assert dropped == []
    units = {c.get("unit") for c in parsed if c.get("title", "").startswith("ROIC")}
    assert "%" in units
    html, dropped_html = parse_charts(
        {
            "roic_history": charts["roic_history"],
            "evil": {"type": "html", "html": "<script>alert(1)</script>"},
        }
    )
    assert any(c["type"] == "bar" for c in html)
    assert "html" in dropped_html


def test_incomplete_roic_years_do_not_invent_missing_fy() -> None:
    charts = system_charts_from_ctx(
        {},
        {
            "roic_years_available": 2,
            "roic_by_year": [{"fy": 2022, "value": 0.12}, {"fy": 2024, "value": 0.18}],
            "fcf_ni": [],
            "ocf_ni": [],
        },
    )
    assert charts["roic_history"]["labels"] == ["2022", "2024"]
    assert "2023" not in charts["roic_history"]["labels"]
    assert "cash_conversion" not in charts

