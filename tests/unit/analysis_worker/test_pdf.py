"""PDF HTML uses allowlisted chart types only; no prompt body."""
from __future__ import annotations

from analysis_worker.jobs.pdf import render_pdf_html


def test_pdf_html_drops_raw_html_chart_and_omits_prompt() -> None:
    html = render_pdf_html(
        {
            "ticker": "MSFT",
            "verdict": "Accumulate",
            "name": "MSFT — Accumulate",
            "sections": {"verdict": "Accumulate", "moat": "cash conversion"},
            "charts": {
                "peers": {"type": "bar"},
                "evil": {"type": "html", "html": "<script>alert(1)</script>"},
            },
        }
    )
    assert "MSFT" in html
    assert "<script>" not in html
    assert "SYSTEM PROMPT" not in html
    assert "evil" not in html
    assert "prompt_versions" not in html
    assert "<div class='bar'>" not in html


def test_pdf_html_renders_labeled_bar_chart() -> None:
    html = render_pdf_html(
        {
            "ticker": "MSFT",
            "verdict": "Hold",
            "name": "MSFT — Hold",
            "sections": {"plain_language": "LAYER 1\nTHE BOTTOM LINE\nHold the name.\n"},
            "charts": {
                "peers": {"type": "bar", "title": "Peers", "labels": ["Cost", "Close"], "values": [100, 120]},
            },
        }
    )
    assert "<div class='bar'>" in html
    assert "Cost" in html
    assert "Close" in html
    assert "<script>" not in html
    assert "prompt_versions" not in html


def test_pdf_html_prints_plain_language_note() -> None:
    html = render_pdf_html(
        {
            "ticker": "META",
            "verdict": "Monitor",
            "name": "META — Monitor",
            "sections": {
                "plain_language": "LAYER 1\nTHE BOTTOM LINE\nMeta at $728 sits between two capex treatments.\n",
                "verdict": "Monitor",
                "moat": "see note",
            },
            "charts": {},
        }
    )
    assert "THE BOTTOM LINE" in html
    assert "Meta at $728" in html
    assert "<h3>" in html
    assert "<pre>" not in html
    assert "<script>" not in html
    assert "MACHINE-READABLE" not in html
    assert '{"ticker"' not in html


def test_pdf_html_hides_machine_json_and_typesets_tables() -> None:
    import json

    machine = {
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
                "rows": [["Tranche", "Amount"], ["Tranche 1", "35%"]],
            },
            {
                "title": "Framework 1 scorecard",
                "type": "table",
                "rows": [["Metric", "Status"], ["ROIC", "Pass"]],
            },
        ],
    }
    prose = (
        "LAYER 1\nTHE BOTTOM LINE\n**HOLD.** Keep the name.\n"
        "MACHINE-READABLE BLOCK\n"
        + json.dumps(machine)
        + "\nEND OF ANALYSIS\n"
    )
    html = render_pdf_html(
        {
            "ticker": "LLY",
            "verdict": "Hold",
            "name": "LLY — Hold",
            "created_at": "2026-10-04T06:15:00Z",
            "sections": {"plain_language": prose, "machine": {}, "verdict": "Hold"},
            "charts": {},
        }
    )
    assert "MACHINE-READABLE" not in html
    assert '{"ticker"' not in html
    assert '"shares_held"' not in html
    assert "<script>" not in html
    assert "SYSTEM PROMPT" not in html
    assert "prompt_versions" not in html
    assert "Key data" in html
    assert "table class='kv'" in html
    assert "Slice plan" in html
    assert "Framework 1 scorecard" in html
    assert "Tranche" in html
    assert "Invested vs market value" in html
    assert "$8,520" in html
    assert "**HOLD.**" not in html
    assert "HOLD." in html
    assert "<h3>" in html


def test_pdf_html_empty_charts_without_pair_has_no_figure() -> None:
    html = render_pdf_html(
        {
            "ticker": "MSFT",
            "verdict": "Hold",
            "name": "MSFT — Hold",
            "sections": {"plain_language": "LAYER 1\nTHE BOTTOM LINE\nHold the name.\n", "machine": {}},
            "charts": {},
        }
    )
    assert "Invested vs market value" not in html
    assert "Cost vs close" not in html
    assert "MACHINE-READABLE" not in html
