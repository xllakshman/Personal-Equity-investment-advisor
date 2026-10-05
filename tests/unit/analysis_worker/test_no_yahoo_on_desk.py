"""Yahoo chart is allowed on /desk read path only (P11-11). Must not write lots."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WEB = ROOT / "apps" / "web"

# After-paint / button, research refresh, and Home trend display quotes.
ALLOWED_YAHOO_URL = {
    "apps/web/app/api/quotes/route.ts",
    "apps/web/app/api/ticker-search/route.ts",
    "apps/web/lib/research/refresh-investor.ts",
    "apps/web/lib/market/yahoo-chart.ts",
}

WRITE_MARKERS = (".insert(", ".update(", ".upsert(", ".delete(")


def _iter_web_src() -> list[Path]:
    out: list[Path] = []
    for path in WEB.rglob("*"):
        if path.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
            continue
        if "node_modules" in path.parts or ".next" in path.parts:
            continue
        if path.name.endswith(".test.ts") or path.name.endswith(".test.tsx"):
            continue
        out.append(path)
    return out


def test_yahoo_urls_only_on_allowed_read_paths() -> None:
    hits: list[str] = []
    for path in _iter_web_src():
        rel = str(path.relative_to(ROOT))
        if rel in ALLOWED_YAHOO_URL:
            continue
        text = path.read_text(encoding="utf-8")
        if "finance.yahoo.com" in text or "query1.finance.yahoo" in text:
            hits.append(rel)
    assert hits == []


def test_quote_helper_does_not_write_holding_lots() -> None:
    chart = (ROOT / "apps/web/lib/market/yahoo-chart.ts").read_text(encoding="utf-8")
    assert "holding_lots" not in chart
    for marker in WRITE_MARKERS:
        assert marker not in chart
    loader = (ROOT / "apps/web/lib/desk/load-portfolio-trend.ts").read_text(
        encoding="utf-8"
    )
    assert "holding_lots" not in loader
    for marker in WRITE_MARKERS:
        assert marker not in loader
    home = (ROOT / "apps/web/lib/desk/load-home.ts").read_text(encoding="utf-8")
    assert 'from("holdings")' in home
    assert 'from("holding_lots")' not in home
    for marker in WRITE_MARKERS:
        assert marker not in home
    quotes = (ROOT / "apps/web/lib/market/load-quotes.ts").read_text(encoding="utf-8")
    assert 'from("holding_lots")' not in quotes
    for marker in WRITE_MARKERS:
        assert marker not in quotes
