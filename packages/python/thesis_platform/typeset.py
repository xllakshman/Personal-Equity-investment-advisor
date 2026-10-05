"""LAYER 1 prose → heading/paragraph blocks. Never keep model HTML."""
from __future__ import annotations

import json
import re
from datetime import datetime
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

SLICE_TITLE = re.compile(r"tranche|slice|ladder|rebased", re.I)
SCORECARD_TITLE = re.compile(r"scorecard|framework\s*1|\broic\b|moat score|f1 ", re.I)
SLICE_KEYS = {
    "tranche_ladder",
    "slices",
    "slice_plan",
    "rebased_tranche_ladder",
    "tranches",
}
SCORECARD_KEYS = {
    "scorecard",
    "framework_1",
    "framework_1_scorecard",
    "roic_scorecard",
    "f1_scorecard",
}
META_TABLE_KEYS = {
    "title",
    "name",
    "caption",
    "label",
    "headers",
    "columns",
    "rows",
    "data",
    "body",
    "markdown",
    "text",
    "type",
}

_TAG = re.compile(r"<[^>]*>")
_ALLOWED_CHARTS = {"line", "bar", "table", "waterfall"}
_MARKUP = re.compile(r"<\s*(script|iframe|object|embed|html|svg|img)\b", re.I)
_PROMPTISH = re.compile(r"prompt_versions|you are an? |system prompt|advisor prompt", re.I)
_SOURCE_LIMIT = 80
_AS_OF_LIMIT = 32


def _clean(raw: str) -> str:
    return _TAG.sub("", raw or "").replace("\xa0", " ").strip()


def strip_markdown(raw: str) -> str:
    text = raw or ""
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"(^|[^\w])\*([^*\n]+)\*(?!\w)", r"\1\2", text)
    text = text.replace("**", "")
    text = re.sub(r"^[ \t]*#{1,6}[ \t]+", "", text, flags=re.M)
    text = re.sub(r"^[ \t]*[*•][ \t]+", "", text, flags=re.M)
    return text


def extract_machine_json(text: str) -> dict[str, Any]:
    """In-memory parse of the MACHINE-READABLE blob. Never write back to Postgres."""
    src = text or ""
    upper = src.upper()
    marker = upper.find("MACHINE-READABLE")
    if marker >= 0:
        after = src[marker:]
        brace = after.find("{")
        if brace < 0:
            return {}
        try:
            data, _end = json.JSONDecoder().raw_decode(after[brace:])
        except json.JSONDecodeError:
            return {}
        return data if isinstance(data, dict) else {}
    last = src.rfind("\n{")
    if last >= 0:
        candidate = src[last + 1 :].strip()
        if candidate.startswith("{") and re.search(r'"ticker"\s*:', candidate):
            try:
                data, _end = json.JSONDecoder().raw_decode(candidate)
            except json.JSONDecodeError:
                return {}
            return data if isinstance(data, dict) else {}
    return {}


def machine_from_sections(sections: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(sections, dict):
        return {}
    stored = sections.get("machine")
    if isinstance(stored, dict) and stored:
        return stored
    prose = sections.get("plain_language")
    if isinstance(prose, str) and prose.strip():
        return extract_machine_json(prose)
    return {}


def _consume_object(src: str) -> str:
    if not src.startswith("{"):
        return ""
    depth = 0
    in_str = False
    escape = False
    for i, c in enumerate(src):
        if in_str:
            if escape:
                escape = False
                continue
            if c == "\\":
                escape = True
                continue
            if c == '"':
                in_str = False
            continue
        if c == '"':
            in_str = True
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return src[: i + 1]
    return src


def strip_machine_readable(raw: str) -> str:
    text = raw or ""
    upper = text.upper()
    marker = upper.find("MACHINE-READABLE")
    if marker >= 0:
        before = text[:marker].rstrip()
        after = text[marker:]
        brace = after.find("{")
        if brace < 0:
            return before
        rest_json = after[brace:]
        try:
            _obj, end = json.JSONDecoder().raw_decode(rest_json)
            rest = rest_json[end:].lstrip()
        except json.JSONDecodeError:
            consumed = _consume_object(rest_json)
            rest = rest_json[len(consumed) :].lstrip() if consumed != rest_json else ""
        parts = [p for p in (before, rest) if p]
        return "\n\n".join(parts).strip()
    last = text.rfind("\n{")
    if last >= 0:
        candidate = text[last + 1 :].strip()
        if candidate.startswith("{") and re.search(r'"ticker"\s*:', candidate):
            try:
                _obj, end = json.JSONDecoder().raw_decode(candidate)
            except json.JSONDecodeError:
                end = len(_consume_object(candidate))
            if end > 20:
                return text[:last].rstrip()
    return text


def display_prose(raw: str) -> str:
    return strip_markdown(strip_machine_readable(_clean(raw or "")))


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


def _is_json_dump(text: str) -> bool:
    t = (text or "").strip()
    if re.search(r"MACHINE-READABLE", t, re.I):
        return True
    if t.startswith("{") and '"' in t:
        return True
    if t.startswith("[") and "{" in t:
        return True
    braces = len(re.findall(r'[{}\[\]"]', t))
    return len(t) > 40 and braces / len(t) > 0.12 and bool(re.search(r'"[a-z_]+"\s*:', t))


def typeset_blocks(raw: str) -> list[dict[str, str]]:
    text = display_prose(raw)
    if not text:
        return []
    blocks: list[dict[str, str]] = []
    para: list[str] = []
    saw_title = False

    def flush() -> None:
        body = " ".join(para).strip()
        para.clear()
        if body and not _is_json_dump(body):
            blocks.append({"kind": "p", "text": re.sub(r"\s+", " ", body)})

    for original in text.splitlines():
        line = strip_markdown(_clean(original))
        if not line:
            flush()
            continue
        if _is_rule(line):
            flush()
            if not blocks or blocks[-1]["kind"] != "rule":
                blocks.append({"kind": "rule", "text": ""})
            continue
        if _is_heading(line) or re.search(r"MACHINE-READABLE", line, re.I):
            flush()
            title = re.sub(r"^#+\s*", "", line).strip()
            if re.search(r"MACHINE-READABLE", title, re.I):
                continue
            blocks.append({"kind": "h2", "text": title})
            continue
        if _is_json_dump(line):
            flush()
            continue
        if (
            not saw_title
            and len(line) <= 80
            and re.search(r"[A-Za-z]", line)
            and not para
            and not re.search(r"[.!?]$", line)
        ):
            prev = blocks[-1]["kind"] if blocks else None
            if prev in (None, "rule"):
                saw_title = True
                blocks.append({"kind": "h1", "text": line})
                continue
        para.append(line)
    flush()
    return blocks


def format_note_money(raw: Any) -> str:
    if raw is None:
        return ""
    if isinstance(raw, bool):
        return str(raw)
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        return _usd(float(raw))
    t = str(raw).strip()
    if not t:
        return ""
    if t.startswith("$") or t.endswith("%"):
        return t
    if re.search(r"[A-Za-z]", t) and not re.fullmatch(r"[-+]?[\d,]+(?:\.\d+)?", t):
        return t
    try:
        n = float(t.replace(",", ""))
    except ValueError:
        return t
    return _usd(n)


def _usd(n: float) -> str:
    abs_n = abs(n)
    if abs_n >= 1000 and n == int(n):
        return f"${int(n):,}"
    return f"${n:,.2f}"


def format_note_date(iso: str) -> str:
    raw = (iso or "").strip()
    if not raw:
        return ""
    try:
        d = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return f"{d.day} {d.strftime('%b')} {d.year}"
    except ValueError:
        return raw[:10] or raw


def _parse_number(raw: Any) -> float | None:
    if isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    if not isinstance(raw, str):
        return None
    try:
        return float(raw.replace("$", "").replace(",", "").strip())
    except ValueError:
        return None


def _first_number(machine: dict[str, Any], keys: tuple[str, ...]) -> float | None:
    for key in keys:
        n = _parse_number(machine.get(key))
        if n is not None:
            return n
    return None


def _first_string(machine: dict[str, Any], keys: tuple[str, ...]) -> str:
    for key in keys:
        v = machine.get(key)
        if v is not None and str(v).strip():
            return str(v).strip()
    return ""


def _price_from_excerpt(excerpt: str | None) -> str:
    if not excerpt:
        return ""
    m = re.search(r"\$\s?[\d,]+(?:\.\d+)?", excerpt)
    return m.group(0).replace(" ", "") if m else ""


def key_facts(
    *,
    ticker: str,
    verdict: str,
    created_at: str | None = None,
    conviction: str | None = None,
    evidence_excerpt: str | None = None,
    machine: dict[str, Any] | None = None,
    model_label: str | None = None,
    filer_type: str | None = None,
    coverage: str | None = None,
) -> list[tuple[str, str]]:
    machine = machine if isinstance(machine, dict) else {}
    facts: list[tuple[str, str]] = []
    name = _first_string(machine, ("ticker",)) or str(ticker or "").strip()
    if name:
        facts.append(("Name", name))
    rating = _first_string(machine, ("classification", "verdict")) or str(verdict or "").strip()
    if rating:
        facts.append(("Rating", rating))
    price_n = _first_number(machine, ("current_price", "price", "close"))
    price = (
        format_note_money(price_n)
        if price_n is not None
        else _first_string(machine, ("current_price", "price", "close"))
        or _price_from_excerpt(evidence_excerpt)
    )
    if price:
        facts.append(("Price", price if price.startswith("$") else format_note_money(price) or price))
    filer = _clean(str(filer_type or "")) or _first_string(machine, ("filer_type",))
    if filer:
        facts.append(("Filer", filer))
    cover = _clean(str(coverage or "")) or _first_string(machine, ("coverage",))
    if cover:
        facts.append(("Coverage", cover))
    if created_at:
        label = format_note_date(str(created_at))
        if label:
            facts.append(("As of", label))
    if conviction:
        facts.append(("Conviction", str(conviction)))
    cost = _first_number(machine, ("cost_basis", "cost_per_share", "avg_cost"))
    if cost is not None:
        facts.append(("Cost", format_note_money(cost)))
    shares_n = _first_number(machine, ("shares_held", "shares", "qty", "quantity"))
    if shares_n is not None:
        if shares_n == int(shares_n):
            facts.append(("Shares", f"{int(shares_n):,}"))
        else:
            facts.append(("Shares", f"{shares_n:,.4f}".rstrip("0").rstrip(".")))
    else:
        shares = _first_string(machine, ("shares_held", "shares", "qty", "quantity"))
        if shares:
            facts.append(("Shares", shares))
    invested = _first_number(machine, ("invested", "invested_amount"))
    if invested is not None:
        facts.append(("Invested", format_note_money(invested)))
    mv = _first_number(machine, ("market_value", "position_value"))
    if mv is not None:
        facts.append(("Market value", format_note_money(mv)))
    if model_label:
        facts.append(("Agent", str(model_label)))
    return facts[:12]


def _classify_title(title: str) -> str:
    if SLICE_TITLE.search(title or ""):
        return "slice"
    if SCORECARD_TITLE.search(title or ""):
        return "scorecard"
    return "other"


def _cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, int) and not isinstance(value, bool):
        return f"{value:,}"
    if isinstance(value, float):
        return f"{value:,.2f}"
    return strip_markdown(_clean(str(value))).strip()


def _split_pipe_row(line: str) -> list[str]:
    text = line.strip().strip("|")
    return [_cell(c) for c in text.split("|")]


def _parse_pipe_table(text: str) -> tuple[list[str], list[list[str]]] | None:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if len(lines) < 2 or "|" not in lines[0]:
        return None
    headers = _split_pipe_row(lines[0])
    start = 1
    stripped = re.sub(r"[|\s]", "", lines[1])
    if re.match(r"^:?-{3,}", stripped):
        start = 2
    rows = [_split_pipe_row(ln) for ln in lines[start:] if "|" in ln]
    if not rows:
        return None
    return headers, rows


def _rows_from(raw: Any) -> list[list[str]]:
    if not isinstance(raw, list) or not raw:
        return []
    first = raw[0]
    if isinstance(first, dict):
        keys = list(first.keys())
        return [[_cell(row.get(k)) for k in keys] for row in raw if isinstance(row, dict)]
    out: list[list[str]] = []
    for row in raw:
        if isinstance(row, list):
            cells = [_cell(c) for c in row]
            if any(cells):
                out.append(cells)
    return out


def looks_numeric_cell(text: str) -> bool:
    return bool(re.match(r"^\$?\(?-?[\d,]+(?:\.\d+)?%?\)?$", (text or "").strip()))


_HEADER_LABELS = {
    "item",
    "value",
    "tranche",
    "amount",
    "metric",
    "status",
    "check",
    "result",
    "field",
    "label",
}


def _first_row_looks_like_headers(row: list[str]) -> bool:
    if len(row) < 2:
        return False
    if any(looks_numeric_cell(c) for c in row):
        return False
    hits = sum(1 for c in row if c.strip().lower() in _HEADER_LABELS)
    return hits >= 2


def _promote_header_row(headers: list[str], rows: list[list[str]]) -> tuple[list[str], list[list[str]]]:
    if any(h.strip() for h in headers):
        return headers, rows
    if rows and _first_row_looks_like_headers(rows[0]):
        return rows[0], rows[1:]
    return headers, rows


def _headers_from(raw: Any, explicit: Any) -> list[str]:
    if isinstance(explicit, list) and explicit:
        return [_cell(h) for h in explicit if not _MARKUP.search(str(h))]
    if isinstance(raw, list) and raw and isinstance(raw[0], dict):
        return [_cell(k) for k in raw[0].keys()]
    return []


def _finish_table(
    title: str,
    headers: list[str],
    rows: list[list[str]],
    fallback_kind: str | None = None,
) -> dict[str, Any] | None:
    if not rows:
        return None
    if any(_MARKUP.search(cell) for row in rows for cell in row):
        return None
    headers, rows = _promote_header_row(headers, rows)
    if not rows:
        return None
    return {
        "kind": fallback_kind or _classify_title(title),
        "title": title,
        "headers": headers,
        "rows": rows,
    }


def _table_from(raw: Any, fallback_title: str, fallback_kind: str | None = None) -> dict[str, Any] | None:
    if isinstance(raw, list) and raw:
        return _finish_table(fallback_title, _headers_from(raw, None), _rows_from(raw), fallback_kind)
    if not isinstance(raw, dict):
        return None
    if str(raw.get("type") or "").lower() == "html":
        return None
    title = _cell(raw.get("title") or raw.get("name") or raw.get("caption") or raw.get("label")) or fallback_title
    md = raw.get("markdown") if isinstance(raw.get("markdown"), str) else raw.get("text")
    if isinstance(md, str) and "|" in md:
        parsed = _parse_pipe_table(md)
        if parsed:
            headers, rows = parsed
            return _finish_table(title, headers, rows, fallback_kind)
    data = raw.get("rows", raw.get("data", raw.get("body")))
    rows = _rows_from(data)
    headers = _headers_from(data, raw.get("headers", raw.get("columns")))
    if not rows:
        kv: list[list[str]] = []
        for key, val in raw.items():
            if key in META_TABLE_KEYS or isinstance(val, (dict, list)):
                continue
            value = _cell(val)
            if not value:
                continue
            kv.append([_cell(key), value])
        if len(kv) >= 2:
            rows = kv
            headers = ["Check", "Result"]
    return _finish_table(title or fallback_title, headers, rows, fallback_kind)


def _push(out: list[dict[str, Any]], table: dict[str, Any] | None) -> None:
    if not table:
        return
    sig = f"{table['kind']}|{table['title']}|{len(table['rows'])}"
    if any(f"{t['kind']}|{t['title']}|{len(t['rows'])}" == sig for t in out):
        return
    out.append(table)


def machine_tables(machine: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(machine, dict):
        return []
    out: list[dict[str, Any]] = []
    tables = machine.get("tables")
    if isinstance(tables, list):
        for i, item in enumerate(tables):
            _push(out, _table_from(item, f"Table {i + 1}"))
    elif isinstance(tables, dict):
        for key, val in tables.items():
            kind = "slice" if key in SLICE_KEYS else "scorecard" if key in SCORECARD_KEYS else _classify_title(key)
            _push(out, _table_from(val, _cell(key), kind))
    for key in SLICE_KEYS:
        if key in machine:
            _push(out, _table_from(machine[key], "Slice plan", "slice"))
    for key in SCORECARD_KEYS:
        if key in machine:
            _push(out, _table_from(machine[key], "Framework scorecard", "scorecard"))
    return out


def price_comparison_chart(
    machine: dict[str, Any] | None,
    evidence_excerpt: str | None = None,
) -> dict[str, Any] | None:
    rec = machine if isinstance(machine, dict) else {}
    close = _first_number(rec, ("current_price", "price", "close"))
    if close is None:
        close = _parse_number(_price_from_excerpt(evidence_excerpt))
    cost = _first_number(rec, ("cost_basis", "cost_per_share", "avg_cost"))
    invested = _first_number(rec, ("invested", "invested_amount"))
    market = _first_number(rec, ("market_value", "position_value"))
    if invested is not None and market is not None:
        return {
            "type": "bar",
            "title": "Invested vs market value",
            "labels": ["Invested", "Market value"],
            "values": [invested, market],
            "rows": [],
        }
    if cost is not None and close is not None:
        return {
            "type": "bar",
            "title": "Cost vs close",
            "labels": ["Cost", "Close"],
            "values": [cost, close],
            "rows": [],
        }
    return None


def parse_charts(raw: Any) -> tuple[list[dict[str, Any]], list[str]]:
    dropped: list[str] = []
    if isinstance(raw, list):
        items = raw
    elif isinstance(raw, dict):
        items = list(raw.values())
    else:
        return [], dropped
    charts: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            dropped.append("not-object")
            continue
        kind = str(item.get("type") or "")
        if kind not in _ALLOWED_CHARTS:
            dropped.append(kind or "missing-type")
            continue
        title = "" if item.get("title") is None else str(item.get("title"))
        if _MARKUP.search(title):
            dropped.append("markup-title")
            continue
        labels = item.get("labels") if isinstance(item.get("labels"), list) else []
        if any(_MARKUP.search(str(x)) for x in labels):
            dropped.append("markup-label")
            continue
        values_raw = item.get("values", item.get("data"))
        values = [float(v) for v in values_raw if isinstance(v, (int, float))] if isinstance(values_raw, list) else []
        rows_raw = item.get("rows")
        rows: list[list[str]] = []
        if isinstance(rows_raw, list):
            for row in rows_raw:
                if isinstance(row, list):
                    rows.append([str(c) for c in row if not _MARKUP.search(str(c))])
        charts.append(
            {
                "type": kind,
                "title": title,
                "labels": [str(x) for x in labels],
                "values": values,
                "rows": rows,
                **_chart_extras(item),
            }
        )
    return charts, dropped


def _chart_extras(item: dict[str, Any]) -> dict[str, Any]:
    extras: dict[str, Any] = {}
    raw_ref = item.get("reference")
    if isinstance(raw_ref, bool):
        raw_ref = None
    if isinstance(raw_ref, (int, float)) and raw_ref == raw_ref:
        extras["reference"] = float(raw_ref)
    raw_unit = item.get("unit")
    if raw_unit is not None:
        unit = str(raw_unit)
        if unit and len(unit) <= 8 and not _MARKUP.search(unit):
            extras["unit"] = unit
    source = _caption_field(item.get("source", item.get("data_source")), _SOURCE_LIMIT)
    if source:
        extras["source"] = source
    as_of = _caption_field(item.get("as_of", item.get("asOf")), _AS_OF_LIMIT)
    if as_of:
        extras["as_of"] = as_of
    return extras


def _caption_field(raw: Any, limit: int) -> str:
    if raw is None:
        return ""
    original = str(raw)
    if _MARKUP.search(original):
        return ""
    text = " ".join(_clean(original).split()).strip()
    if not text or _PROMPTISH.search(text):
        return ""
    return text[:limit]


def chart_caption_meta(chart: dict[str, Any]) -> str:
    bits: list[str] = []
    source = str(chart.get("source") or "").strip()
    as_of = str(chart.get("as_of") or "").strip()
    if source:
        bits.append(source)
    if as_of:
        bits.append(f"as of {as_of}")
    return " · ".join(bits)


def chart_view_rows(chart: dict[str, Any]) -> list[list[str]]:
    if str(chart.get("type") or "") == "table":
        rows = chart.get("rows") or []
        if isinstance(rows, list) and rows:
            return [list(row) if isinstance(row, list) else [str(row)] for row in rows]
    labels = chart.get("labels") if isinstance(chart.get("labels"), list) else []
    values = chart.get("values") if isinstance(chart.get("values"), list) else []
    out: list[list[str]] = [["Period", "Value"]]
    for i, label in enumerate(labels):
        value = values[i] if i < len(values) else ""
        out.append([str(label), "" if value == "" else str(value)])
    ref = chart.get("reference")
    if isinstance(ref, (int, float)) and not isinstance(ref, bool) and ref == ref:
        out.append(["Reference", str(ref)])
    return out
