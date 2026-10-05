"""PDF HTML uses allowlisted chart types only; no prompt body."""
from __future__ import annotations

from analysis_worker.jobs.pdf import attach_pdf, render_pdf_html


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


def test_pdf_html_renders_roic_percent_and_drops_html() -> None:
    html = render_pdf_html(
        {
            "ticker": "MSFT",
            "verdict": "Hold",
            "name": "MSFT — Hold",
            "sections": {"plain_language": "LAYER 1\nTHE BOTTOM LINE\nHold the name.\n"},
            "charts": {
                "roic_history": {
                    "type": "bar",
                    "title": "ROIC vs 15%",
                    "labels": ["2024"],
                    "values": [18.25],
                    "reference": 15,
                    "unit": "%",
                },
                "cash_conversion": {
                    "type": "bar",
                    "title": "Cash conversion vs 80%",
                    "labels": ["2024 FCF/NI", "2024 OCF/NI"],
                    "values": [137.5, 187.5],
                    "reference": 80,
                    "unit": "%",
                },
                "evil": {"type": "html", "html": "<script>alert(1)</script>"},
            },
        }
    )
    assert "ROIC vs 15%" in html
    assert "18.25%" in html
    assert "$18.25" not in html
    assert "Cash conversion vs 80%" in html
    assert "137.5%" in html
    assert "class='ref'" in html
    assert "<script>" not in html
    assert "prompt_versions" not in html
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


def test_pdf_html_shows_source_as_of_and_view_data() -> None:
    html = render_pdf_html(
        {
            "ticker": "MSFT",
            "verdict": "Hold",
            "name": "MSFT — Hold",
            "sections": {"plain_language": "LAYER 1\nTHE BOTTOM LINE\nHold the name.\n"},
            "charts": {
                "price_vs_tranches": {
                    "type": "line",
                    "title": "Price vs 52-week",
                    "labels": ["2026-01-31", "2026-02-28"],
                    "values": [90, 80],
                    "source": "Yahoo Finance chart v8",
                    "as_of": "2026-02-28",
                },
                "pie": {"type": "pie", "title": "Segments", "labels": ["A"], "values": [1]},
                "evil": {"type": "html", "html": "<script>alert(1)</script>"},
            },
        }
    )
    assert "Price vs 52-week" in html
    assert "Yahoo Finance chart v8" in html
    assert "as of 2026-02-28" in html
    assert "View data" in html
    assert "2026-01-31" in html
    assert "Segments" not in html
    assert "<script>" not in html
    assert "prompt_versions" not in html
    assert "<svg" not in html.lower()


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
    assert "<h2>" in html
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
    assert "<h2>" in html


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


def test_pdf_html_escapes_script_in_prose() -> None:
    html = render_pdf_html(
        {
            "ticker": "MSFT",
            "verdict": "Hold",
            "sections": {
                "plain_language": "LAYER 1\nTHE BOTTOM LINE\n<script>alert(1)</script>\nHold the name.\n"
            },
            "charts": {},
        }
    )
    assert "<script>" not in html
    assert "alert(1)" in html


def test_pdf_html_includes_evidence_and_cover_date() -> None:
    html = render_pdf_html(
        {
            "ticker": "LLY",
            "verdict": "Hold",
            "name": "LLY — Hold",
            "created_at": "2026-10-04T06:15:00Z",
            "sections": {"plain_language": "LAYER 1\nTHE BOTTOM LINE\nHold.\n"},
            "charts": {},
            "evidence": [
                {"step0_number": 1, "query": "previous close", "excerpt": '{"close": 825.4}'},
            ],
        }
    )
    assert "What we checked" in html
    assert "previous close" in html
    assert "4 Oct 2026" in html
    assert "Key data" in html
    assert "<script>" not in html


def test_attach_pdf_uploads_and_sets_key() -> None:
    class Cur:
        def __init__(self) -> None:
            self.sql = ""
            self.updated = None

        def execute(self, sql, params=None):
            self.sql = sql
            if "update reports set pdf_key" in sql.lower():
                self.updated = params

        def fetchone(self):
            if "from reports" in self.sql.lower():
                return {
                    "id": "rep1",
                    "family_id": "fam1",
                    "request_id": "req1",
                    "ticker": "LLY",
                    "name": "LLY — Hold",
                    "verdict": "Hold",
                    "conviction": None,
                    "sections": {"plain_language": "LAYER 1\nTHE BOTTOM LINE\nHold.\n"},
                    "charts": {},
                    "created_at": "2026-10-04T06:15:00Z",
                }
            return None

        def fetchall(self):
            return [{"step0_number": 1, "query": "previous close", "excerpt": "$825.40"}]

        def close(self):
            return None

    class Conn:
        def __init__(self, cur: Cur):
            self._cur = cur

        def cursor(self, **kwargs):
            return self._cur

    cur = Cur()
    captured: dict[str, object] = {}

    def fake_render(page_html: str) -> bytes:
        captured["html"] = page_html
        return b"%PDF-fake"

    def fake_upload(settings, path, data):
        captured["path"] = path
        captured["data"] = data

    path = attach_pdf(Conn(cur), object(), "rep1", render=fake_render, uploader=fake_upload)  # type: ignore[arg-type]
    assert path == "fam1/rep1.pdf"
    assert cur.updated == ("fam1/rep1.pdf", "rep1")
    assert captured["data"] == b"%PDF-fake"
    html = str(captured["html"])
    assert "MACHINE-READABLE" not in html
    assert "What we checked" in html
    assert "$825.40" in html


def test_pdf_html_integrity_warnings_strip_html_and_show_filer() -> None:
    html = render_pdf_html(
        {
            "ticker": "MSFT",
            "verdict": "Hold",
            "name": "MSFT — Hold",
            "sections": {
                "plain_language": "LAYER 1\nTHE BOTTOM LINE\nHold the name.\n",
                "filer_type": "Large accelerated filer",
                "integrity_warnings": [
                    {
                        "code": "price_mismatch",
                        "message": "Note price <b>$400</b> does not match pack close $412.50.",
                    }
                ],
            },
            "charts": {},
        }
    )
    assert "Large accelerated filer" in html
    assert "Numbers to double-check" in html
    assert "$412.50" in html
    assert "<b>" not in html
    assert "<script>" not in html
    assert "prompt_versions" not in html
