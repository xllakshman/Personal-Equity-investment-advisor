from thesis_platform.charts import system_charts_from_ctx
from thesis_platform.derived import derived_levels
from thesis_platform.typeset import parse_charts


def test_system_charts_line_and_table_no_pie() -> None:
    ctx = {
        "evidence": [
            {
                "step0_number": 1,
                "excerpt": (
                    '{"close": 80, "high_52w": 100, "monthly_closes": ['
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
    parsed, dropped = parse_charts(charts)
    assert dropped == []
    kinds = {c["type"] for c in parsed}
    assert "line" in kinds
    assert "table" in kinds
    assert "pie" not in kinds
    pie, dropped_pie = parse_charts({"x": {"type": "pie", "title": "seg"}})
    assert pie == []
    assert "pie" in dropped_pie
