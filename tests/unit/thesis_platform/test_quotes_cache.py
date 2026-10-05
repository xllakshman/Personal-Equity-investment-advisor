from pathlib import Path

from thesis_platform.quotes import get_cached_close, put_cached_close

ROOT = Path(__file__).resolve().parents[3]


def test_eod_quotes_helpers_never_write_lots() -> None:
    text = (ROOT / "packages/python/thesis_platform/quotes.py").read_text(encoding="utf-8")
    assert "eod_quotes" in text
    assert "holding_lots" not in text
    gather = (ROOT / "apps/analysis-worker/src/analysis_worker/jobs/gather.py").read_text(
        encoding="utf-8"
    )
    assert "insert into analysis_evidence" in gather
    assert "holding_lots" not in gather
    assert "stockanalysis.com" not in gather
    yahoo = (ROOT / "packages/python/thesis_platform/http.py").read_text(encoding="utf-8")
    assert "stockanalysis.com" not in yahoo
    assert callable(get_cached_close)
    assert callable(put_cached_close)
