"""Playwright PDF render + Storage upload (D38 / P4-03)."""
from __future__ import annotations

import html
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection
from psycopg2.extras import RealDictCursor

from thesis_platform.config import Settings
from thesis_platform.storage import pdf_object_path, upload_pdf


def render_pdf_html(report: dict[str, Any]) -> str:
    verdict = html.escape(str(report.get("verdict") or ""))
    ticker = html.escape(str(report.get("ticker") or ""))
    name = html.escape(str(report.get("name") or ""))
    sections = report.get("sections") or {}
    charts = report.get("charts") or {}
    blocks = []
    for key in ("step0", "moat", "pre_buy", "sizing", "profit_booking", "construction", "verdict"):
        if key in sections:
            blocks.append(
                f"<h2>{html.escape(key)}</h2><pre>{html.escape(str(sections[key])[:4000])}</pre>"
            )
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
        + "</title></head><body>"
        + f"<h1>{ticker} — {verdict}</h1>"
        + "".join(blocks)
        + "".join(chart_bits)
        + "</body></html>"
    )


def html_to_pdf_bytes(page_html: str) -> bytes:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(page_html, wait_until="load")
        data = page.pdf(format="A4")
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
