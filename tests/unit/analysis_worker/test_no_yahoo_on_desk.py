"""Desk / web must never call Yahoo (D40)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WEB = ROOT / "apps" / "web"


def test_next_app_does_not_call_yahoo() -> None:
    hits: list[str] = []
    for path in WEB.rglob("*"):
        if path.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
            continue
        if "node_modules" in path.parts or ".next" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        if "finance.yahoo.com" in text or "query1.finance.yahoo" in text:
            hits.append(str(path.relative_to(ROOT)))
    assert hits == []
