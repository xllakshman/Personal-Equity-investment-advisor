"""PDF typeset HTML and Storage refresh (no Playwright in unit tests)."""
from __future__ import annotations

import json

from thesis_platform.pdf import refresh_stored_pdf, render_pdf_html

MACHINE = {
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


def test_render_pdf_html_hides_machine_and_typesets() -> None:
    prose = (
        "LAYER 1\nTHE BOTTOM LINE\n**HOLD.** Keep the name.\n"
        "MACHINE-READABLE BLOCK\n"
        + json.dumps(MACHINE)
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
    assert "<h2>" in html
    assert "<pre>" not in html
    assert "4 Oct 2026" in html


def test_render_pdf_html_empty_machine_has_no_optional_tables() -> None:
    html = render_pdf_html(
        {
            "ticker": "MSFT",
            "verdict": "Hold",
            "sections": {"plain_language": "LAYER 1\nTHE BOTTOM LINE\nHold.\n", "machine": {}},
            "charts": {},
        }
    )
    assert "Slice plan" not in html
    assert "Framework 1 scorecard" not in html
    assert "Invested vs market value" not in html
    assert "Cost vs close" not in html
    assert "What we checked" not in html
    assert "MACHINE-READABLE" not in html


def test_refresh_stored_pdf_uploads_typeset_bytes_not_json_dump() -> None:
    captured: dict[str, object] = {}

    def fake_render(page_html: str) -> bytes:
        captured["html"] = page_html
        return b"%PDF-fake"

    def fake_upload(settings, path, data):
        captured["path"] = path
        captured["data"] = data

    path = refresh_stored_pdf(
        settings=object(),  # type: ignore[arg-type]
        report={
            "ticker": "LLY",
            "verdict": "Hold",
            "name": "LLY — Hold",
            "sections": {
                "plain_language": "LAYER 1\nTHE BOTTOM LINE\nHold.\nMACHINE-READABLE BLOCK\n"
                + json.dumps(MACHINE),
                "machine": MACHINE,
            },
            "charts": {},
        },
        object_key="fam1/rep1.pdf",
        render=fake_render,
        uploader=fake_upload,
    )
    assert path == "fam1/rep1.pdf"
    html = str(captured["html"])
    assert "MACHINE-READABLE" not in html
    assert "Key data" in html
    assert "Slice plan" in html
    assert captured["data"] == b"%PDF-fake"
    assert captured["path"] == "fam1/rep1.pdf"
    assert "<script>" not in html
