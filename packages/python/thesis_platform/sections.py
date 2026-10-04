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


def _json_object_text(raw: str) -> str:
    """Labs often wrap JSON in markdown or a short preamble. Take the object only."""
    text = (raw or "").strip().lstrip("\ufeff")
    if text.startswith("```"):
        first_nl = text.find("\n")
        if first_nl >= 0:
            text = text[first_nl + 1 :]
        close = text.rfind("```")
        if close >= 0:
            text = text[:close]
        text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return text[start : end + 1]
    return text


def is_progress_key(key: str) -> bool:
    k = (key or "").lower()
    return k == "stage_status" or k.startswith("retrieval_") or k.startswith("stage_")


def is_inflight_sections(sections: dict[str, Any]) -> bool:
    """True for retrieval checklists / stage_status dumps — not a finished note."""
    if not isinstance(sections, dict) or not sections:
        return True
    prose = note_document(sections)
    if len(prose) >= 800 and _looks_like_longform(prose):
        return False
    if any(is_progress_key(str(k)) for k in sections):
        return True
    missing = missing_comprehensive_keys(sections, "long_term")
    blob = json.dumps(sections).lower()
    if missing and ("in_progress" in blob or '"status": "pending"' in blob or '"status":"pending"' in blob):
        return True
    return False


def strip_progress_keys(sections: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in sections.items() if not is_progress_key(str(k))}


def assert_finished_note(sections: dict[str, Any], intent: str) -> None:
    if is_inflight_sections(sections):
        raise SectionsError("inflight stage_status is not a finished note")
    prose = note_document(sections)
    if len(prose) >= 800 and _looks_like_longform(prose):
        return
    assert_comprehensive(sections, intent)


def parse_note_payload(raw: str) -> dict[str, Any]:
    """Finished long-form note, or JSON sections. Never a retrieval checklist."""
    text = (raw or "").strip().lstrip("\ufeff")
    if _looks_like_longform(text):
        return longform_to_sections(text)
    return parse_sections_json(text)


def _looks_like_longform(text: str) -> bool:
    upper = (text or "").upper()
    hits = sum(
        1
        for marker in (
            "THE BOTTOM LINE",
            "LAYER 1",
            "PLAIN LANGUAGE",
            "END OF ANALYSIS",
            "WHAT THIS COMPANY DOES",
        )
        if marker in upper
    )
    return hits >= 2 or ("THE BOTTOM LINE" in upper and len(text) >= 800)


def _extract_machine_json(text: str) -> dict[str, Any]:
    marker = (text or "").upper().find("MACHINE-READABLE")
    start_from = marker if marker >= 0 else 0
    brace = (text or "").find("{", start_from)
    if brace < 0:
        return {}
    try:
        data, _end = json.JSONDecoder().raw_decode(text[brace:])
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _heading_slice(text: str, heading: str) -> str:
    upper = text.upper()
    i = upper.find(heading.upper())
    if i < 0:
        return ""
    rest = text[i:]
    nl = rest.find("\n")
    body = rest[nl + 1 :] if nl >= 0 else rest
    cut = len(body)
    for sep in ("\n-----", "\n#####", "\n====="):
        j = body.find(sep)
        if 0 < j < cut:
            cut = j
    return body[:cut].strip()[:12000]


def _verdict_from_longform(text: str, machine: dict[str, Any]) -> str:
    raw = str(machine.get("classification") or machine.get("verdict") or "").strip()
    mapping = {
        "MONITOR": "Monitor",
        "BUY": "Buy",
        "HOLD": "Hold",
        "SELL": "Sell",
        "ACCUMULATE": "Accumulate",
        "AVOID": "Avoid",
        "PASS": "Pass",
    }
    if raw.upper() in mapping:
        return mapping[raw.upper()]
    upper = text.upper()
    for token, label in mapping.items():
        if f" {token} " in f" {upper} " or upper.startswith(token):
            if token in upper.split("THE BOTTOM LINE", 1)[-1][:800]:
                return label
    return "Hold"


def longform_to_sections(text: str) -> dict[str, Any]:
    machine = _extract_machine_json(text)
    bear = _heading_slice(text, "WHAT COULD GO WRONG") or "see note"
    return {
        "plain_language": text.strip(),
        "verdict": _verdict_from_longform(text, machine),
        "moat": machine.get("moat") or _heading_slice(text, "IS IT A GOOD BUSINESS") or "see note",
        "pre_buy": {"bear_case": bear},
        "step0": _heading_slice(text, "WHAT THIS COMPANY DOES") or text[:800],
        "sizing": _heading_slice(text, "IS THE PRICE FAIR") or "",
        "profit_booking": _heading_slice(text, "WHAT YOU'D EARN") or "",
        "construction": _heading_slice(text, "HOW MUCH HAS TO GO RIGHT") or "",
        "machine": machine,
    }


def note_document(sections: dict[str, Any]) -> str:
    """Investor-readable body for UI and PDF. Never HTML."""
    if not isinstance(sections, dict):
        return ""
    prose = sections.get("plain_language")
    if isinstance(prose, str) and len(prose.strip()) >= 200:
        return prose.strip()
    parts: list[str] = []
    for key in COMPREHENSIVE_KEYS:
        if key not in sections:
            continue
        val = sections[key]
        if isinstance(val, str) and val.strip():
            parts.append(val.strip())
        elif isinstance(val, dict):
            for pref in ("note", "prose", "text", "body", "bear_case", "call"):
                chunk = val.get(pref)
                if isinstance(chunk, str) and chunk.strip():
                    parts.append(chunk.strip())
                    break
    return "\n\n".join(parts)


def parse_sections_json(raw: str) -> dict[str, Any]:
    text = _json_object_text(raw)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        preview = (raw or "").strip().replace("\n", " ")[:80]
        raise SectionsError(f"sections json invalid starts {preview!r}") from exc
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
