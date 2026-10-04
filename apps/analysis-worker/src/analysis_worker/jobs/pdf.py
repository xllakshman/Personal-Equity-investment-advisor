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


def render_pdf_html(report: dict[str, Any]) -> str:
    verdict = html.escape(str(report.get("verdict") or ""))
    ticker = html.escape(str(report.get("ticker") or ""))
    name = html.escape(str(report.get("name") or ""))
    sections = report.get("sections") or {}
    if not isinstance(sections, dict):
        sections = {}
    prose = sections.get("plain_language")
    if isinstance(prose, str) and prose.strip():
        body = prose.strip()
    else:
        body = note_document(sections)
    if not body:
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
        body = "\n\n".join(chunks)
    body = html.escape(body[:200000])
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
        "body{font:11.5pt/1.5 Georgia,'Times New Roman',serif;margin:28px 36px;color:#111}"
        "h1{font:700 18pt/1.25 Georgia,serif;margin:0 0 8px}"
        "p.meta{color:#444;margin:0 0 18px;font:11pt/1.4 Georgia,serif}"
        "pre{white-space:pre-wrap;font:inherit;margin:0}"
        "</style></head><body>"
        + f"<h1>{ticker} — {verdict}</h1>"
        + f"<p class='meta'>{name}</p>"
        + f"<pre>{body}</pre>"
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
