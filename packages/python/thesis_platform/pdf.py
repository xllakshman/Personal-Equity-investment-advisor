"""Typeset report HTML → Playwright PDF bytes → Storage upsert.

Shared by the worker (new Analyse) and analysis-api GET /reports/:id/pdf
(re-render of existing notes). Never writes reports.sections. Never embeds
prompt_versions.body.
"""
from __future__ import annotations

import html
from typing import Any

from thesis_platform.config import Settings
from thesis_platform.sections import note_document
from thesis_platform.storage import upload_pdf
from thesis_platform.typeset import (
    chart_caption_meta,
    chart_view_rows,
    format_note_date,
    format_note_money,
    key_facts,
    looks_numeric_cell,
    machine_from_sections,
    machine_tables,
    parse_charts,
    price_comparison_chart,
    typeset_blocks,
)
from thesis_platform.integrity import sanitize_display_text

_FACE = "-apple-system,'SF Pro Text','Helvetica Neue',Helvetica,'IBM Plex Sans',Calibri,sans-serif"


def _as_dict(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    return {}


def _prose(sections: dict[str, Any]) -> str:
    raw = sections.get("plain_language")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()[:200000]
    body = note_document(sections)
    if body:
        return body[:200000]
    chunks: list[str] = []
    for key in (
        "plain_language",
        "step0",
        "moat",
        "pre_buy",
        "sizing",
        "profit_booking",
        "construction",
        "verdict",
    ):
        if key in sections and key != "machine":
            chunks.append(str(sections[key])[:12000])
    return "\n\n".join(chunks)


def _blocks_html(blocks: list[dict[str, str]]) -> str:
    bits: list[str] = []
    for block in blocks:
        kind = block.get("kind")
        text = html.escape(block.get("text") or "")
        if kind == "rule":
            bits.append("<hr/>")
        elif kind in ("h1", "h2"):
            bits.append(f"<h2>{text}</h2>")
        elif text:
            bits.append(f"<p>{text}</p>")
    return "".join(bits)


def _table_html(title: str, headers: list[str], rows: list[list[str]], *, kv: bool = False) -> str:
    cap = html.escape(title)
    head = ""
    shown_headers = [h for h in headers if str(h).strip()]
    if shown_headers and not kv:
        cells = "".join(f"<th>{html.escape(h)}</th>" for h in shown_headers)
        head = f"<thead><tr>{cells}</tr></thead>"
    body_rows = []
    for row in rows:
        tds: list[str] = []
        for i, c in enumerate(row):
            cell = html.escape(c)
            if kv and i == 0:
                tds.append(f"<th scope='row'>{cell}</th>")
            elif looks_numeric_cell(c):
                tds.append(f"<td class='num'>{cell}</td>")
            else:
                tds.append(f"<td>{cell}</td>")
        body_rows.append(f"<tr>{''.join(tds)}</tr>")
    klass = " class='kv'" if kv else ""
    return (
        f"<p class='caption'>{cap}</p>"
        f"<table{klass}>{head}<tbody>{''.join(body_rows)}</tbody></table>"
    )


def _chart_head(chart: dict[str, Any]) -> str:
    title = html.escape(str(chart.get("title") or "Figure"))
    bits = [f"<p class='caption'>{title}</p>"]
    meta = chart_caption_meta(chart)
    if meta:
        bits.append(f"<p class='chart-meta'>{html.escape(meta)}</p>")
    return "".join(bits)


def _chart_html(chart: dict[str, Any]) -> str:
    title = html.escape(str(chart.get("title") or "Figure"))
    kind = str(chart.get("type") or "")
    head = _chart_head(chart)
    if kind == "table":
        rows = chart.get("rows") or []
        table = _table_html(title, [], rows if isinstance(rows, list) else [])
        # _table_html repeats the title caption; keep source/as_of above the table.
        if table.startswith("<p class='caption'>"):
            rest = table.split("</p>", 1)[-1] if "</p>" in table else table
            return head + rest
        return head + table
    labels = chart.get("labels") or []
    values = chart.get("values") or []
    if not isinstance(labels, list) or not isinstance(values, list) or not labels:
        return head
    nums = [float(v) for v in values if isinstance(v, (int, float)) and not isinstance(v, bool)]
    ref = chart.get("reference")
    if isinstance(ref, bool):
        ref = None
    if isinstance(ref, (int, float)) and ref == ref:
        nums.append(float(ref))
    else:
        ref = None
    max_v = max([abs(v) for v in nums] or [1])
    unit = str(chart.get("unit") or "")
    ref_html = ""
    if ref is not None and max_v:
        left = min(100.0, (abs(float(ref)) / max_v) * 100)
        ref_html = f"<div class='ref' style='left:{left:.1f}%'></div>"
    bars = []
    for i, label in enumerate(labels):
        value = values[i] if i < len(values) else 0
        try:
            n = float(value)
        except (TypeError, ValueError):
            n = 0.0
        width = min(100, (abs(n) / max_v) * 100) if max_v else 0
        if unit == "%":
            shown = html.escape(f"{_pct_text(n)}%")
        else:
            shown = format_note_money(n) if isinstance(value, (int, float)) else html.escape(str(value))
        bars.append(
            "<div class='bar'><b>"
            + html.escape(str(label))
            + f"</b><div class='track'>{ref_html}<div class='fill' style='width:{width:.1f}%'></div></div>"
            f"<span>{shown}</span></div>"
        )
    return head + "".join(bars) + _view_data_html(chart)


def _view_data_html(chart: dict[str, Any]) -> str:
    rows = chart_view_rows(chart)
    if len(rows) <= 1:
        return ""
    unit = str(chart.get("unit") or "")
    body: list[str] = []
    for i, row in enumerate(rows):
        cells: list[str] = []
        for j, cell in enumerate(row):
            text = str(cell)
            if i > 0 and j > 0:
                try:
                    n = float(text)
                except (TypeError, ValueError):
                    n = None
                if n is not None and n == n:
                    if unit == "%":
                        text = f"{_pct_text(n)}%"
                    elif str(row[0]).lower() != "reference":
                        text = format_note_money(n) or text
            escaped = html.escape(text)
            if i == 0:
                cells.append(f"<th>{escaped}</th>")
            elif j > 0 and looks_numeric_cell(text):
                cells.append(f"<td class='num'>{escaped}</td>")
            else:
                cells.append(f"<td>{escaped}</td>")
        body.append(f"<tr>{''.join(cells)}</tr>")
    head_row = body[0]
    rest = "".join(body[1:])
    return (
        "<p class='caption'>View data</p>"
        f"<table><thead>{head_row}</thead><tbody>{rest}</tbody></table>"
    )


def _pct_text(n: float) -> str:
    text = f"{n:.2f}".rstrip("0").rstrip(".")
    return text or "0"


def _warnings_html(sections: dict[str, Any]) -> str:
    raw = sections.get("integrity_warnings")
    if not isinstance(raw, list) or not raw:
        return ""
    items: list[str] = []
    for row in raw:
        if isinstance(row, str):
            msg = sanitize_display_text(row)
        elif isinstance(row, dict):
            msg = sanitize_display_text(row.get("message"))
        else:
            continue
        if msg:
            items.append(f"<li>{html.escape(msg)}</li>")
    if not items:
        return ""
    return (
        "<p class='caption'>Numbers to double-check</p>"
        f"<ul>{''.join(items)}</ul>"
    )


def _evidence_table(evidence: list[dict[str, Any]]) -> str:
    rows: list[list[str]] = []
    for row in evidence:
        if not isinstance(row, dict):
            continue
        excerpt = str(row.get("excerpt") or "—")[:2000]
        rows.append(
            [
                str(row.get("step0_number") or row.get("step0Number") or ""),
                str(row.get("query") or "—")[:400],
                excerpt or "—",
            ]
        )
    if not rows:
        return ""
    return _table_html("What we checked", ["#", "Query", "Excerpt"], rows)


def render_pdf_html(report: dict[str, Any]) -> str:
    verdict = html.escape(str(report.get("verdict") or ""))
    ticker = html.escape(str(report.get("ticker") or ""))
    name = html.escape(str(report.get("name") or f"{ticker} — {verdict}"))
    created = format_note_date(str(report.get("created_at") or "") or "")
    sections = _as_dict(report.get("sections"))
    machine = machine_from_sections(sections)
    evidence = report.get("evidence") if isinstance(report.get("evidence"), list) else []
    excerpt = str(report.get("evidence_excerpt") or "") or None
    if not excerpt and evidence and isinstance(evidence[0], dict):
        excerpt = str(evidence[0].get("excerpt") or "") or None
    facts = key_facts(
        ticker=str(report.get("ticker") or ""),
        verdict=str(report.get("verdict") or ""),
        created_at=str(report.get("created_at") or "") or None,
        conviction=str(report.get("conviction") or "") or None,
        evidence_excerpt=excerpt,
        machine=machine,
        filer_type=str(sections.get("filer_type") or "") or None,
        coverage=str(sections.get("coverage") or "") or None,
    )
    kpi = (
        _table_html("Key data", [], [[k, v] for k, v in facts], kv=True)
        if facts
        else ""
    )
    extra_tables = []
    for table in machine_tables(machine):
        extra_tables.append(
            _table_html(str(table.get("title") or ""), table.get("headers") or [], table.get("rows") or [])
        )
    stored, _dropped = parse_charts(report.get("charts") or {})
    derived = price_comparison_chart(machine, excerpt)
    candidates = stored if stored else ([derived] if derived else [])
    shown = []
    for c in candidates:
        if str(c.get("type") or "") == "table":
            if c.get("rows"):
                shown.append(c)
        elif c.get("labels"):
            shown.append(c)
    chart_bits = [_chart_html(c) for c in shown]
    body = _blocks_html(typeset_blocks(_prose(sections)))
    sub = f"{ticker} · {verdict}"
    if created:
        sub += f" · {html.escape(created)}"
    return (
        "<!doctype html><html><head><meta charset='utf-8'><title>"
        + name
        + "</title><style>"
        f"body{{font:400 11.5pt/1.55 {_FACE};margin:28px 36px;color:#111}}"
        f"h1{{font:700 22pt/1.2 {_FACE};margin:0 0 8px}}"
        f"h2{{font:700 16pt/1.3 {_FACE};margin:22px 0 8px}}"
        f"p.meta{{color:#444;margin:0 0 16px;font:600 9.5pt/1.3 {_FACE};"
        "letter-spacing:.08em;text-transform:uppercase}}"
        f"p.sub{{color:#333;margin:0 0 18px;font:400 11pt/1.45 {_FACE};text-transform:none;letter-spacing:0}}"
        "p{margin:0 0 11px;font-weight:400;font-size:11.5pt}"
        f"p.caption{{font:700 9pt/1.3 {_FACE};letter-spacing:.08em;"
        "text-transform:uppercase;color:#555;margin:18px 0 8px}}"
        f"p.chart-meta{{font:400 9pt/1.4 {_FACE};color:#555;margin:0 0 10px;"
        "letter-spacing:0;text-transform:none}}"
        "hr{border:none;border-top:1px solid #ccc;margin:14px 0}"
        "table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:10.5pt}"
        "th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;vertical-align:top}"
        "th{font-weight:600;color:#444}"
        "td.num{text-align:right;font-variant-numeric:tabular-nums}"
        "table.kv th{width:34%;font-weight:600}"
        ".bar{display:flex;align-items:center;gap:8px;margin:0 0 8px}"
        ".bar b{width:130px;flex:none;font-size:9.5pt;font-weight:500}"
        ".track{flex:1;height:7px;background:#eee;border-radius:3px;overflow:hidden;position:relative}"
        ".fill{height:100%;background:#333}"
        ".ref{position:absolute;top:0;bottom:0;border-left:1px dashed #666}"
        "</style></head><body>"
        + "<p class='meta'>Equity note</p>"
        + f"<h1>{name}</h1>"
        + f"<p class='sub'>{sub}</p>"
        + kpi
        + "".join(extra_tables)
        + _warnings_html(sections)
        + "".join(chart_bits)
        + f"<div class='body'>{body}</div>"
        + _evidence_table(evidence)
        + "</body></html>"
    )


def html_to_pdf_bytes(page_html: str) -> bytes:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(page_html, wait_until="load")
        data = page.pdf(format="A4", margin={"top": "16mm", "bottom": "16mm", "left": "14mm", "right": "14mm"})
        browser.close()
    return data


def refresh_stored_pdf(
    settings: Settings,
    report: dict[str, Any],
    *,
    object_key: str,
    render: Any | None = None,
    uploader: Any | None = None,
) -> str:
    """Render current reports.sections into the existing Storage object. No SQL."""
    page_html = render_pdf_html(report)
    pdf_bytes = (render or html_to_pdf_bytes)(page_html)
    (uploader or upload_pdf)(settings, object_key, pdf_bytes)
    return object_key
