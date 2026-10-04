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
    assert "bar" in html
    assert "<script>" not in html
    assert "SYSTEM PROMPT" not in html
    assert "evil" not in html


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
    assert "<script>" not in html
