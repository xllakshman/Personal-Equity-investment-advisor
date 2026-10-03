"""Desk RSC must never call Yahoo (D40). User-clicked API routes may."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WEB = ROOT / "apps" / "web"

# After-paint / button only. Never imported by a desk Server Component.
ALLOWED = {
    "apps/web/app/api/quotes/route.ts",
    "apps/web/app/api/ticker-search/route.ts",
    "apps/web/lib/research/refresh-investor.ts",
}


def test_next_app_does_not_call_yahoo() -> None:
    hits: list[str] = []
    for path in WEB.rglob("*"):
        if path.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
            continue
        if "node_modules" in path.parts or ".next" in path.parts:
            continue
        rel = str(path.relative_to(ROOT))
        if rel in ALLOWED:
            continue
        text = path.read_text(encoding="utf-8")
        if "finance.yahoo.com" in text or "query1.finance.yahoo" in text:
            hits.append(rel)
    assert hits == []
