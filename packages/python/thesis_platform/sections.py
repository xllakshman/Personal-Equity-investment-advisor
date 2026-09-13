"""Report sections validation (P4-02)."""
from __future__ import annotations

import json
from typing import Any

COMPREHENSIVE_KEYS = (
    "step0",
    "moat",
    "pre_buy",
    "sizing",
    "profit_booking",
    "construction",
    "verdict",
)


class SectionsError(ValueError):
    pass


def parse_sections_json(raw: str) -> dict[str, Any]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SectionsError("sections json invalid") from exc
    if not isinstance(data, dict):
        raise SectionsError("sections json invalid")
    return data


def missing_comprehensive_keys(sections: dict[str, Any], intent: str) -> list[str]:
    required = list(COMPREHENSIVE_KEYS)
    if intent == "swing":
        required.append("dual_sleeve")
    missing = [k for k in required if k not in sections]
    pre = sections.get("pre_buy")
    if not isinstance(pre, dict) or "bear_case" not in pre:
        missing.append("bear_case")
    return missing


def assert_comprehensive(sections: dict[str, Any], intent: str) -> None:
    missing = missing_comprehensive_keys(sections, intent)
    if missing:
        raise SectionsError("missing keys: " + ",".join(missing))


def adherence_failures(node: Any, prefix: str = "") -> list[str]:
    failed: list[str] = []
    if isinstance(node, dict):
        flag = node.get("adherence")
        if isinstance(flag, str) and flag.upper() == "NO":
            failed.append(prefix or "root")
        for key, val in node.items():
            if key == "adherence":
                continue
            path = f"{prefix}.{key}" if prefix else str(key)
            failed.extend(adherence_failures(val, path))
    elif isinstance(node, list):
        for i, item in enumerate(node):
            path = f"{prefix}[{i}]" if prefix else f"[{i}]"
            failed.extend(adherence_failures(item, path))
    return failed


def mentions_us_options(sections: dict[str, Any]) -> bool:
    blob = json.dumps(sections).lower()
    needles = ("call option", "put option", "covered call", "us options", "buy calls")
    return any(n in blob for n in needles)
