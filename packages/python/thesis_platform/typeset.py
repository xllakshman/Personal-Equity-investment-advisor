"""LAYER 1 prose → heading/paragraph blocks. Never keep model HTML."""
from __future__ import annotations

import re
from typing import Any

HEADING_MARKERS = (
    "THE BOTTOM LINE",
    "LAYER 1",
    "PLAIN LANGUAGE",
    "WHAT THIS COMPANY DOES",
    "IS IT A GOOD BUSINESS",
    "WHAT COULD GO WRONG",
    "IS THE PRICE FAIR",
    "WHAT YOU'D EARN",
    "HOW MUCH HAS TO GO RIGHT",
    "END OF ANALYSIS",
    "NOT ADVICE",
    "MACHINE-READABLE",
    "INVESTMENT OVERVIEW",
    "COMPANY OVERVIEW",
    "RISKS",
)

_TAG = re.compile(r"<[^>]*>")


def _clean(raw: str) -> str:
    return _TAG.sub("", raw or "").replace("\xa0", " ").strip()


def _is_rule(line: str) -> bool:
    t = re.sub(r"\s", "", line)
    return len(t) >= 8 and bool(re.fullmatch(r"[=\-─—_*]+", t))


def _is_heading(line: str) -> bool:
    upper = line.upper()
    if any(m in upper and len(line) < 80 for m in HEADING_MARKERS):
        return True
    if len(line) > 72:
        return False
    letters = re.sub(r"[^A-Za-z]", "", line)
    if len(letters) < 8:
        return False
    caps = re.sub(r"[^A-Z]", "", letters)
    return len(caps) / len(letters) >= 0.78


def typeset_blocks(raw: str) -> list[dict[str, str]]:
    text = _clean(raw)
    if not text:
        return []
    blocks: list[dict[str, str]] = []
    para: list[str] = []
    saw_title = False

    def flush() -> None:
        body = " ".join(para).strip()
        para.clear()
        if body:
            blocks.append({"kind": "p", "text": re.sub(r"\s+", " ", body)})

    for original in text.splitlines():
        line = _clean(original)
        if not line:
            flush()
            continue
        if _is_rule(line):
            flush()
            if not blocks or blocks[-1]["kind"] != "rule":
                blocks.append({"kind": "rule", "text": ""})
            continue
        if _is_heading(line):
            flush()
            title = re.sub(r"^#+\s*", "", line).strip()
            blocks.append({"kind": "h2", "text": title})
            continue
        if (
            not saw_title
            and len(line) <= 80
            and re.search(r"[A-Za-z]", line)
            and not para
        ):
            prev = blocks[-1]["kind"] if blocks else None
            if prev in (None, "rule"):
                saw_title = True
                blocks.append({"kind": "h1", "text": line})
                continue
        para.append(line)
    flush()
    return blocks


def key_facts(
    *,
    ticker: str,
    verdict: str,
    created_at: str | None = None,
    evidence_excerpt: str | None = None,
    machine: dict[str, Any] | None = None,
) -> list[tuple[str, str]]:
    machine = machine if isinstance(machine, dict) else {}
    facts: list[tuple[str, str]] = []
    name = str(machine.get("ticker") or ticker or "").strip()
    if name:
        facts.append(("Name", name))
    rating = str(machine.get("classification") or machine.get("verdict") or verdict or "").strip()
    if rating:
        facts.append(("Rating", rating))
    price = machine.get("current_price")
    if price is not None and str(price).strip():
        p = str(price).strip()
        facts.append(("Price", p if p.startswith("$") else f"${p}"))
    else:
        m = re.search(r"\$\s?[\d,]+(?:\.\d+)?", evidence_excerpt or "")
        if m:
            facts.append(("Price", m.group(0).replace(" ", "")))
    if created_at:
        facts.append(("As of", str(created_at)[:10]))
    return facts[:6]
