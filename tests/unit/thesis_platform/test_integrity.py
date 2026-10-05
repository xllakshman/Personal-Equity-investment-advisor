from pathlib import Path

from thesis_platform.integrity import (
    attach_report_meta,
    coverage_label,
    integrity_warnings,
    needs_integrity_repair,
    news_is_absent,
    sanitize_display_text,
)
from thesis_platform.status import FOUND, INPUTS_MISSING, NOT_COVERED, SOURCE_ERROR


def test_news_absent_only_after_successful_empty_fetch() -> None:
    assert news_is_absent({"status": FOUND, "filings": []}) is True
    assert news_is_absent({"status": "ok", "filings": []}) is True
    assert news_is_absent({"status": FOUND, "filings": [{"form": "8-K"}]}) is False
    assert news_is_absent({"status": SOURCE_ERROR, "filings": []}) is False
    assert news_is_absent({"status": NOT_COVERED, "filings": []}) is False
    assert news_is_absent(None) is False


def test_nse_coverage_is_not_covered_not_disclosed() -> None:
    ctx = {
        "ticker": "HDFCBANK",
        "exchange": "NSE",
        "evidence": [{"step0_number": 1, "excerpt": '{"close": 1500}'}],
        "fundamentals_annual": {"status": NOT_COVERED, "years": [], "field_status": {}},
    }
    label = coverage_label(ctx)
    assert "not covered" in label.lower()
    assert "NOT_DISCLOSED" not in label
    assert "disclosed" not in label.lower()


def test_integrity_warning_when_price_mismatches() -> None:
    ctx = {
        "derived": {"close": 412.5, "roic_by_year": [{"fy": 2024, "value": 0.18}]},
        "fundamentals_annual": {
            "status": FOUND,
            "years": [{"fy": 2024, "roic": 0.18, "fcf": None}],
            "field_status": {"capex": INPUTS_MISSING, "fcf": INPUTS_MISSING},
        },
    }
    warnings = integrity_warnings({"current_price": 400.0, "roic": 0.10}, ctx)
    codes = {w["code"] for w in warnings}
    assert "price_mismatch" in codes
    assert "roic_mismatch" in codes
    blob = " ".join(w["message"] for w in warnings)
    assert "$400.00" in blob
    assert "$412.50" in blob
    assert "<" not in blob
    rounded = integrity_warnings({"current_price": 412.50, "roic": 18.0}, ctx)
    assert rounded == []
    assert needs_integrity_repair(
        {"machine": {"current_price": 400.0, "roic": 0.10}}, ctx
    )
    assert not needs_integrity_repair(
        {"machine": {"current_price": 412.50, "roic": 18.0}}, ctx
    )
    assert not needs_integrity_repair(None, ctx)
    assert not needs_integrity_repair({}, ctx)
    assert not needs_integrity_repair({"machine": {"current_price": 400.0}}, None)


def test_sanitize_strips_html_and_prompt() -> None:
    assert "<" not in sanitize_display_text("Note <b>$400</b>")
    assert sanitize_display_text("prompt_versions.body leak") == ""
    assert sanitize_display_text("You are an advisor") == ""


def test_attach_meta_on_new_sections_only_shape() -> None:
    sections = {
        "plain_language": "LAYER 1\nTHE BOTTOM LINE\nHold.\nEND OF ANALYSIS",
        "verdict": "Hold",
        "machine": {"current_price": 1, "ticker": "MSFT"},
    }
    ctx = {
        "evidence": [
            {
                "step0_number": 2,
                "query": "sec edgar headlines MSFT",
                "excerpt": {
                    "status": FOUND,
                    "filings": [{"form": "8-K"}],
                    "filer_type": "Large accelerated filer",
                },
            }
        ],
        "derived": {"close": 412.5},
        "fundamentals_annual": {"status": FOUND, "years": [], "field_status": {}},
    }
    out = attach_report_meta(sections, ctx)
    assert out["filer_type"] == "Large accelerated filer"
    assert out["integrity_warnings"][0]["code"] == "price_mismatch"
    assert sections.get("filer_type") is None
    old = attach_report_meta({"verdict": "Hold"}, {"evidence": [], "fundamentals_annual": {}})
    assert "integrity_warnings" not in old


def test_three_passes_static_contracts() -> None:
    """Pass 1 meter; pass 2 empty/NSE; pass 3 display/no prompt leak."""
    complete = (
        Path(__file__).resolve().parents[3]
        / "apps/analysis-worker/src/analysis_worker/jobs/complete.py"
    ).read_text(encoding="utf-8")
    assert "insert into usage_events" not in complete
    assert "update usage_events" in complete
    assert "attach_report_meta" in complete
    assert "needs_integrity_repair" in complete
    assert "json_schema" not in complete
    assert "update reports set" not in complete.lower()
    assert "openrouter" not in complete.lower()
    assert "stockanalysis" not in complete.lower()
    empty = integrity_warnings({}, {"derived": {}, "fundamentals_annual": {}})
    assert empty == []
    nse = news_is_absent({"status": NOT_COVERED, "filings": []})
    assert nse is False
    leak = sanitize_display_text("<script>prompt_versions.body</script>")
    assert leak == ""
    assert "prompt_versions" not in leak
    draft = (
        Path(__file__).resolve().parents[3]
        / "docs/prompts/p11-19-integrity-repair.md"
    )
    assert draft.is_file()
    assert "not" in draft.read_text(encoding="utf-8").lower()
    assert "docs/prompts" not in complete
    assert "p11-19" not in complete
