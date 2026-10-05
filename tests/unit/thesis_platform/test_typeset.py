import json

from thesis_platform.typeset import (
    chart_caption_meta,
    chart_view_rows,
    extract_machine_json,
    key_facts,
    machine_from_sections,
    machine_tables,
    parse_charts,
    price_comparison_chart,
    strip_machine_readable,
    strip_markdown,
    typeset_blocks,
)

LLY_MACHINE = {
    "ticker": "LLY",
    "classification": "HOLD",
    "price": 825.4,
    "cost_per_share": 710,
    "shares_held": 12,
    "invested_amount": 8520,
    "market_value": 9904.8,
    "tables": [
        {
            "title": "Slice plan",
            "type": "table",
            "rows": [
                ["Tranche", "Amount"],
                ["Tranche 1", "35%"],
                ["Tranche 2", "25%"],
            ],
        },
        {
            "title": "Framework 1 scorecard",
            "type": "table",
            "rows": [
                ["Metric", "Status"],
                ["ROIC", "Pass"],
                ["Moat", "Narrow"],
            ],
        },
    ],
}

LLY_PROSE = "\n".join(
    [
        "LAYER 1 — PLAIN LANGUAGE",
        "THE BOTTOM LINE",
        "**HOLD.** Keep the name. *Tranche 1* waits.",
        "WHAT THIS COMPANY DOES",
        "Eli Lilly sells medicines.",
        "MACHINE-READABLE BLOCK",
        json.dumps(LLY_MACHINE),
        "END OF ANALYSIS",
    ]
)


def test_typeset_splits_headings_and_strips_tags() -> None:
    blocks = typeset_blocks(
        "LAYER 1\nTHE BOTTOM LINE\nMeta at $728.\n<script>alert(1)</script>\nWHAT THIS COMPANY DOES\nAds."
    )
    kinds = [b["kind"] for b in blocks]
    assert "h2" in kinds
    blob = " ".join(b.get("text", "") for b in blocks)
    assert "THE BOTTOM LINE" in blob
    assert "<script>" not in blob
    assert "alert(1)" in blob


def test_typeset_empty() -> None:
    assert typeset_blocks("") == []
    assert typeset_blocks("   ") == []
    blocks = typeset_blocks("Synthetic Maya seed — not a live underwrite.")
    assert any(b["kind"] == "p" and "Synthetic Maya seed" in b["text"] for b in blocks)
    assert not any(b["kind"] == "h1" for b in blocks)


def test_hides_machine_readable_and_trailing_json() -> None:
    blocks = typeset_blocks(LLY_PROSE)
    blob = "\n".join(b.get("text", "") for b in blocks)
    assert "MACHINE-READABLE" not in blob.upper()
    assert '{"ticker"' not in blob
    assert '"shares_held"' not in blob
    assert "Keep the name" in blob


def test_strips_markdown_hold_and_tranche() -> None:
    assert strip_markdown("**HOLD.**") == "HOLD."
    assert strip_markdown("*Tranche 1*") == "Tranche 1"
    blocks = typeset_blocks("THE BOTTOM LINE\n**HOLD.** Keep the name.\n*Tranche 1* waits.")
    blob = " ".join(b.get("text", "") for b in blocks)
    assert "**" not in blob
    assert "*Tranche" not in blob
    assert "HOLD." in blob
    assert "Tranche 1" in blob


def test_strip_machine_readable_keeps_note() -> None:
    out = strip_machine_readable("Hold the name.\nMACHINE-READABLE BLOCK\n" + json.dumps({"ticker": "LLY"}))
    assert "Hold the name." in out
    assert "MACHINE-READABLE" not in out.upper()
    assert '"ticker"' not in out


def test_key_facts_price() -> None:
    facts = key_facts(
        ticker="META",
        verdict="Hold",
        machine={"current_price": "728.08", "classification": "HOLD"},
    )
    assert ("Name", "META") in facts
    assert ("Price", "$728.08") in facts


def test_key_facts_lly_aliases() -> None:
    facts = dict(key_facts(ticker="LLY", verdict="Hold", machine=LLY_MACHINE))
    assert facts["Price"] == "$825.40"
    assert facts["Cost"] == "$710.00"
    assert facts["Shares"] == "12"
    assert facts["Invested"] == "$8,520"
    assert facts["Market value"] == "$9,904.80"


def test_key_facts_filer_and_coverage() -> None:
    facts = dict(
        key_facts(
            ticker="MSFT",
            verdict="Hold",
            filer_type="Large accelerated filer",
            coverage="Capex missing",
        )
    )
    assert facts["Filer"] == "Large accelerated filer"
    assert facts["Coverage"] == "Capex missing"
    old = dict(key_facts(ticker="MSFT", verdict="Hold"))
    assert "Filer" not in old
    assert "Coverage" not in old


def test_machine_tables_slice_and_scorecard() -> None:
    tables = machine_tables(LLY_MACHINE)
    assert len(tables) == 2
    slice_t = next(t for t in tables if t["kind"] == "slice")
    score = next(t for t in tables if t["kind"] == "scorecard")
    assert slice_t["headers"] == ["Tranche", "Amount"]
    assert slice_t["rows"][0] == ["Tranche 1", "35%"]
    assert score["headers"] == ["Metric", "Status"]
    assert score["rows"][0] == ["ROIC", "Pass"]


def test_machine_tables_empty_and_html_dropped() -> None:
    assert machine_tables(None) == []
    assert machine_tables({}) == []
    assert machine_tables({"tables": [{"type": "html", "rows": [["a", "b"]]}]}) == []


def test_price_comparison_chart_pairs() -> None:
    invested = price_comparison_chart(LLY_MACHINE)
    assert invested is not None
    assert invested["title"] == "Invested vs market value"
    assert invested["values"] == [8520, 9904.8]
    cost = price_comparison_chart({"cost_per_share": 10, "price": 12})
    assert cost is not None
    assert cost["title"] == "Cost vs close"
    assert price_comparison_chart({}) is None
    assert price_comparison_chart(None) is None


def test_parse_charts_empty_and_html_dropped() -> None:
    charts, dropped = parse_charts({})
    assert charts == []
    charts, dropped = parse_charts({"evil": {"type": "html", "html": "<script>alert(1)</script>"}})
    assert charts == []
    assert "html" in dropped
    kept, dropped_ok = parse_charts(
        {
            "roic_history": {
                "type": "bar",
                "title": "ROIC vs 15%",
                "labels": ["2024"],
                "values": [18.25],
                "reference": 15,
                "unit": "%",
            }
        }
    )
    assert dropped_ok == []
    assert kept[0]["reference"] == 15.0
    assert kept[0]["unit"] == "%"
    assert kept[0]["values"] == [18.25]
    old_shape, old_dropped = parse_charts(
        [{"type": "bar", "title": "Peers", "labels": ["A", "B"], "values": [1, 2]}]
    )
    assert old_dropped == []
    assert old_shape[0]["labels"] == ["A", "B"]
    assert old_shape[0]["values"] == [1.0, 2.0]
    assert "source" not in old_shape[0]
    with_meta, meta_dropped = parse_charts(
        {
            "price_vs_tranches": {
                "type": "line",
                "title": "Price vs 52-week",
                "labels": ["2026-01", "2026-02"],
                "values": [90, 80],
                "source": "Yahoo Finance chart v8",
                "as_of": "2026-02-28",
            },
            "pie": {"type": "pie", "title": "Segments", "labels": ["A"], "values": [1]},
        }
    )
    assert meta_dropped == ["pie"]
    assert with_meta[0]["source"] == "Yahoo Finance chart v8"
    assert with_meta[0]["as_of"] == "2026-02-28"
    dirty, _ = parse_charts(
        [
            {
                "type": "bar",
                "title": "Peers",
                "labels": ["A"],
                "values": [1],
                "source": "prompt_versions.body",
            }
        ]
    )
    assert "source" not in dirty[0]


def test_chart_caption_and_view_rows() -> None:
    assert chart_caption_meta({"title": "x"}) == ""
    assert (
        chart_caption_meta({"source": "Yahoo Finance chart v8", "as_of": "2026-02-28"})
        == "Yahoo Finance chart v8 · as of 2026-02-28"
    )
    rows = chart_view_rows(
        {"type": "bar", "labels": ["2024"], "values": [18.25], "reference": 15}
    )
    assert rows[0] == ["Period", "Value"]
    assert rows[1] == ["2024", "18.25"]
    assert rows[2] == ["Reference", "15"]


def test_machine_from_sections_parses_prose_when_machine_empty() -> None:
    assert machine_from_sections({"machine": {}}) == {}
    parsed = machine_from_sections({"plain_language": LLY_PROSE, "machine": {}})
    assert parsed["ticker"] == "LLY"
    assert parsed["shares_held"] == 12
    assert extract_machine_json(LLY_PROSE)["ticker"] == "LLY"
