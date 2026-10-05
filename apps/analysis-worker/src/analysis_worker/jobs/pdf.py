"""Playwright PDF render + Storage upload (D38 / P4-03)."""
from __future__ import annotations

import html
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection
from psycopg2.extras import RealDictCursor

from thesis_platform.config import Settings
from thesis_platform.sections import note_document
from thesis_platform.storage import pdf_object_path, upload_pdf
from thesis_platform.typeset import (
    format_note_money,
    key_facts,
    looks_numeric_cell,
    machine_from_sections,
    machine_tables,
    parse_charts,
    price_comparison_chart,
    typeset_blocks,
)


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
        elif kind == "h1":
            bits.append(f"<h2>{text}</h2>")
        elif kind == "h2":
            bits.append(f"<h3>{text}</h3>")
        elif text:
            bits.append(f"<p>{text}</p>")
    return "".join(bits)


def _table_html(title: str, headers: list[str], rows: list[list[str]]) -> str:
    cap = html.escape(title)
    head = ""
    if headers:
        cells = "".join(f"<th>{html.escape(h)}</th>" for h in headers)
        head = f"<thead><tr>{cells}</tr></thead>"
    body_rows = []
    for row in rows:
        tds = "".join(
            f"<td class='num'>{html.escape(c)}</td>" if looks_numeric_cell(c) else f"<td>{html.escape(c)}</td>"
            for c in row
        )
        body_rows.append(f"<tr>{tds}</tr>")
    return (
        f"<p class='caption'>{cap}</p>"
        f"<table>{head}<tbody>{''.join(body_rows)}</tbody></table>"
    )


def _chart_html(chart: dict[str, Any]) -> str:
    title = html.escape(str(chart.get("title") or "Figure"))
    kind = str(chart.get("type") or "")
    if kind == "table":
        rows = chart.get("rows") or []
        return _table_html(title, [], rows if isinstance(rows, list) else [])
    labels = chart.get("labels") or []
    values = chart.get("values") or []
    if not isinstance(labels, list) or not isinstance(values, list) or not labels:
        return f"<h3>{title}</h3>"
    nums = [float(v) for v in values if isinstance(v, (int, float))]
    max_v = max([abs(v) for v in nums] or [1])
    bars = []
    for i, label in enumerate(labels):
        value = values[i] if i < len(values) else 0
        try:
            n = float(value)
        except (TypeError, ValueError):
            n = 0.0
        width = min(100, (abs(n) / max_v) * 100) if max_v else 0
        shown = format_note_money(n) if isinstance(value, (int, float)) else html.escape(str(value))
        bars.append(
            "<div class='bar'><b>"
            + html.escape(str(label))
            + f"</b><div class='track'><div class='fill' style='width:{width:.1f}%'></div></div>"
            f"<span>{shown}</span></div>"
        )
    return f"<p class='caption'>{title}</p>" + "".join(bars)


def render_pdf_html(report: dict[str, Any]) -> str:
    verdict = html.escape(str(report.get("verdict") or ""))
    ticker = html.escape(str(report.get("ticker") or ""))
    name = html.escape(str(report.get("name") or f"{ticker} — {verdict}"))
    sections = report.get("sections") or {}
    if not isinstance(sections, dict):
        sections = {}
    machine = machine_from_sections(sections)
    facts = key_facts(
        ticker=str(report.get("ticker") or ""),
        verdict=str(report.get("verdict") or ""),
        created_at=str(report.get("created_at") or "") or None,
        conviction=str(report.get("conviction") or "") or None,
        evidence_excerpt=str(report.get("evidence_excerpt") or "") or None,
        machine=machine,
    )
    fact_rows = "".join(
        f"<tr><th>{html.escape(k)}</th><td>{html.escape(v)}</td></tr>" for k, v in facts
    )
    kpi = (
        "<p class='caption'>Key data</p><table class='kv'><tbody>"
        + fact_rows
        + "</tbody></table>"
        if fact_rows
        else ""
    )
    extra_tables = []
    for table in machine_tables(machine):
        extra_tables.append(
            _table_html(str(table.get("title") or ""), table.get("headers") or [], table.get("rows") or [])
        )
    stored, _dropped = parse_charts(report.get("charts") or {})
    derived = price_comparison_chart(machine, str(report.get("evidence_excerpt") or "") or None)
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
    return (
        "<!doctype html><html><head><meta charset='utf-8'><title>"
        + name
        + "</title><style>"
        "body{font:400 11.5pt/1.55 'IBM Plex Sans',Calibri,sans-serif;margin:28px 36px;color:#111}"
        "h1{font:700 20pt/1.25 'IBM Plex Sans',sans-serif;margin:0 0 6px}"
        "h2{font:700 16pt/1.3 'IBM Plex Sans',sans-serif;margin:20px 0 8px}"
        "h3{font:700 15pt/1.35 'IBM Plex Sans',sans-serif;margin:18px 0 8px;color:#111}"
        "p.meta{color:#444;margin:0 0 16px;font:400 10.5pt/1.4 'IBM Plex Sans',sans-serif}"
        "p{margin:0 0 11px;font-weight:400;font-size:11.5pt}"
        "p.caption{font:700 9pt/1.3 'IBM Plex Sans',sans-serif;letter-spacing:.08em;"
        "text-transform:uppercase;color:#555;margin:18px 0 8px}"
        "hr{border:none;border-top:1px solid #ccc;margin:14px 0}"
        "table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:10.5pt}"
        "th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;vertical-align:top}"
        "th{font-weight:600;color:#444}"
        "td.num{text-align:right;font-variant-numeric:tabular-nums}"
        "table.kv th{width:34%;font-weight:600}"
        ".bar{display:flex;align-items:center;gap:8px;margin:0 0 8px}"
        ".bar b{width:110px;flex:none;font-size:9.5pt}"
        ".track{flex:1;height:7px;background:#eee;border-radius:3px;overflow:hidden}"
        ".fill{height:100%;background:#333}"
        "</style></head><body>"
        + "<p class='meta'>Equity note</p>"
        + f"<h1>{name}</h1>"
        + f"<p class='meta'>{ticker} · {verdict}</p>"
        + kpi
        + "".join(extra_tables)
        + "".join(chart_bits)
        + f"<div class='body'>{body}</div>"
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


def attach_pdf(
    conn: connection,
    settings: Settings,
    report_id: UUID | str,
    *,
    render: Any | None = None,
    uploader: Any | None = None,
) -> str:
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        "select id, family_id, ticker, name, verdict, conviction, sections, charts, created_at from reports where id = %s",
        (report_id,),
    )
    report = cur.fetchone()
    if not report:
        raise RuntimeError("report not found")
    page_html = render_pdf_html(dict(report))
    pdf_bytes = (render or html_to_pdf_bytes)(page_html)
    path = pdf_object_path(str(report["family_id"]), str(report["id"]))
    (uploader or upload_pdf)(settings, path, pdf_bytes)
    cur.execute(
        "update reports set pdf_key = %s where id = %s",
        (path, report_id),
    )
    cur.close()
    return path
