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
from thesis_platform.typeset import key_facts, typeset_blocks


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
        if key in sections:
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


def render_pdf_html(report: dict[str, Any]) -> str:
    verdict = html.escape(str(report.get("verdict") or ""))
    ticker = html.escape(str(report.get("ticker") or ""))
    name = html.escape(str(report.get("name") or f"{ticker} — {verdict}"))
    sections = report.get("sections") or {}
    if not isinstance(sections, dict):
        sections = {}
    machine = sections.get("machine") if isinstance(sections.get("machine"), dict) else {}
    facts = key_facts(
        ticker=str(report.get("ticker") or ""),
        verdict=str(report.get("verdict") or ""),
        created_at=str(report.get("created_at") or "") or None,
        evidence_excerpt=str(report.get("evidence_excerpt") or "") or None,
        machine=machine,
    )
    kpi = "".join(
        f"<div class='kpi'><div class='k'>{html.escape(k)}</div>"
        f"<div class='v'>{html.escape(v)}</div></div>"
        for k, v in facts
    )
    body = _blocks_html(typeset_blocks(_prose(sections)))
    charts = report.get("charts") or {}
    chart_bits = []
    if isinstance(charts, dict):
        for cid, spec in charts.items():
            if not isinstance(spec, dict):
                continue
            kind = spec.get("type")
            if kind not in {"line", "bar", "table", "waterfall"}:
                continue
            chart_bits.append(
                f"<h3>{html.escape(str(cid))} ({html.escape(str(kind))})</h3>"
            )
    return (
        "<!doctype html><html><head><meta charset='utf-8'><title>"
        + name
        + "</title><style>"
        "body{font:11.5pt/1.5 Calibri,Carlito,Georgia,serif;margin:28px 36px;color:#111}"
        "h1{font:700 18pt/1.25 Calibri,Carlito,Georgia,serif;margin:0 0 6px}"
        "h2{font:700 14pt/1.3 Calibri,Carlito,Georgia,serif;margin:18px 0 8px}"
        "h3{font:700 11.5pt/1.35 Calibri,Carlito,Georgia,serif;letter-spacing:.04em;"
        "text-transform:uppercase;margin:16px 0 8px;color:#222}"
        "p.meta{color:#444;margin:0 0 16px;font:11pt/1.4 Calibri,Carlito,sans-serif}"
        "p{margin:0 0 10px}"
        "hr{border:none;border-top:1px solid #ccc;margin:14px 0}"
        ".kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 18px}"
        ".kpi{border:1px solid #ddd;padding:8px 10px}"
        ".kpi .k{font:700 8pt/1.2 Calibri,sans-serif;letter-spacing:.08em;"
        "text-transform:uppercase;color:#666}"
        ".kpi .v{font:600 12pt/1.3 Calibri,sans-serif;margin-top:4px}"
        "</style></head><body>"
        + f"<p class='meta'>Equity note</p>"
        + f"<h1>{name}</h1>"
        + f"<p class='meta'>{ticker} · {verdict}</p>"
        + (f"<div class='kpis'>{kpi}</div>" if kpi else "")
        + f"<div class='body'>{body}</div>"
        + "".join(chart_bits)
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
        "select id, family_id, ticker, name, verdict, sections, charts from reports where id = %s",
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
