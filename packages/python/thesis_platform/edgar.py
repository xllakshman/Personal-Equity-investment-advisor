"""SEC EDGAR headlines (8-K / 10-Q / 10-K) from data.sec.gov. Never full HTML in packs."""
from __future__ import annotations

import html
import re
from typing import Any

from thesis_platform.derived import excerpt_payload
from thesis_platform.status import FOUND, NOT_COVERED, normalize_status

EDGAR_FORMS = frozenset({"8-K", "10-Q", "10-K"})
COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data/{cik_int}/{acc_nodash}/{doc}"
ARCHIVE_INDEX_URL = (
    "https://www.sec.gov/Archives/edgar/data/{cik_int}/{acc_nodash}/index.json"
)
MAX_HEADLINES = 8
SUMMARY_CHARS = 180
EXHIBIT_TEXT_CHARS = 60000
_SCRIPT = re.compile(r"(?is)<script[^>]*>.*?</script>")
_STYLE = re.compile(r"(?is)<style[^>]*>.*?</style>")
_TAG = re.compile(r"(?s)<[^>]+>")
_EX99 = re.compile(r"ex[-_]?99(?:[-._]?1)?", re.I)
_EARNINGS_TITLE = re.compile(r"earnings|results of operation|quarterly results", re.I)


class EdgarError(ValueError):
    """HTTP or payload miss. Caller must not fail the Analyse job for this."""


def cik_from_tickers_map(payload: Any, ticker: str) -> str | None:
    want = (ticker or "").strip().upper().replace(".", "-")
    if not want or not isinstance(payload, dict):
        return None
    for row in payload.values():
        if not isinstance(row, dict):
            continue
        marked = str(row.get("ticker") or "").strip().upper().replace(".", "-")
        if marked != want:
            continue
        try:
            cik_int = int(row.get("cik_str"))
        except (TypeError, ValueError):
            return None
        if cik_int <= 0:
            return None
        return f"{cik_int:010d}"
    return None


def filing_archive_url(cik: str, accession: str, primary_doc: str) -> str:
    cik_int = str(int(cik))
    acc_nodash = (accession or "").replace("-", "")
    doc = (primary_doc or "").strip() or "index.html"
    return ARCHIVE_URL.format(cik_int=cik_int, acc_nodash=acc_nodash, doc=doc)


def parse_submissions_headlines(
    payload: Any,
    cik: str,
    *,
    limit: int = MAX_HEADLINES,
) -> list[dict[str, str]]:
    if not isinstance(payload, dict):
        return []
    filings = payload.get("filings") if isinstance(payload.get("filings"), dict) else {}
    recent = filings.get("recent") if isinstance(filings.get("recent"), dict) else {}
    forms = recent.get("form") if isinstance(recent.get("form"), list) else []
    dates = recent.get("filingDate") if isinstance(recent.get("filingDate"), list) else []
    accessions = (
        recent.get("accessionNumber")
        if isinstance(recent.get("accessionNumber"), list)
        else []
    )
    docs = (
        recent.get("primaryDocument")
        if isinstance(recent.get("primaryDocument"), list)
        else []
    )
    titles = (
        recent.get("primaryDocDescription")
        if isinstance(recent.get("primaryDocDescription"), list)
        else []
    )
    out: list[dict[str, str]] = []
    for i, form in enumerate(forms):
        kind = str(form or "").strip().upper()
        if kind not in EDGAR_FORMS:
            continue
        accession = str(accessions[i] if i < len(accessions) else "")
        doc = str(docs[i] if i < len(docs) else "")
        title = str(titles[i] if i < len(titles) else "") or kind
        filed = str(dates[i] if i < len(dates) else "")[:10]
        summary = title.strip()[:SUMMARY_CHARS]
        out.append(
            {
                "form": kind,
                "title": title.strip()[:200] or kind,
                "filed": filed,
                "url": filing_archive_url(cik, accession, doc),
                "summary": summary,
            }
        )
        if len(out) >= limit:
            break
    return out


def empty_pack(status: str = NOT_COVERED) -> dict[str, Any]:
    return {"status": status, "filings": []}


def filer_type_from_submissions(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None
    cat = str(payload.get("category") or "").strip()
    if cat:
        return cat[:80]
    return None


def headlines_from_evidence(evidence: list[Any] | None) -> dict[str, Any]:
    for row in evidence or []:
        if not isinstance(row, dict):
            continue
        query = str(row.get("query") or "").lower()
        if "companyfacts" in query:
            continue
        try:
            step = int(row.get("step0_number") or 0)
        except (TypeError, ValueError):
            step = 0
        if "exhibit" in query or "99.1" in query:
            continue
        if step != 2 and "edgar" not in query and "headlines" not in query:
            continue
        payload = excerpt_payload(row.get("excerpt"))
        if payload.get("status") or payload.get("filings") is not None:
            status = normalize_status(payload.get("status"))
            filings = payload.get("filings") if isinstance(payload.get("filings"), list) else []
            out: dict[str, Any] = {
                "status": status or FOUND,
                "filings": filings,
            }
            filer = str(payload.get("filer_type") or "").strip()
            if filer:
                out["filer_type"] = filer[:80]
            return out
    return empty_pack(NOT_COVERED)


def empty_exhibit(status: str = NOT_COVERED) -> dict[str, Any]:
    return {
        "status": status,
        "accession": None,
        "filed": None,
        "url": None,
        "text": "",
    }


def latest_earnings_8k(payload: Any, cik: str) -> dict[str, str] | None:
    """Most recent 8-K with item 2.02 (earnings). Do not invent a filing."""
    if not isinstance(payload, dict):
        return None
    filings = payload.get("filings") if isinstance(payload.get("filings"), dict) else {}
    recent = filings.get("recent") if isinstance(filings.get("recent"), dict) else {}
    forms = recent.get("form") if isinstance(recent.get("form"), list) else []
    dates = recent.get("filingDate") if isinstance(recent.get("filingDate"), list) else []
    accessions = (
        recent.get("accessionNumber")
        if isinstance(recent.get("accessionNumber"), list)
        else []
    )
    docs = (
        recent.get("primaryDocument")
        if isinstance(recent.get("primaryDocument"), list)
        else []
    )
    titles = (
        recent.get("primaryDocDescription")
        if isinstance(recent.get("primaryDocDescription"), list)
        else []
    )
    items = recent.get("items") if isinstance(recent.get("items"), list) else []
    for i, form in enumerate(forms):
        if str(form or "").strip().upper() != "8-K":
            continue
        accession = str(accessions[i] if i < len(accessions) else "")
        doc = str(docs[i] if i < len(docs) else "")
        title = str(titles[i] if i < len(titles) else "")
        filed = str(dates[i] if i < len(dates) else "")[:10]
        item = str(items[i] if i < len(items) else "")
        if "2.02" in item or _EARNINGS_TITLE.search(title):
            return {
                "accession": accession,
                "filed": filed,
                "primary_doc": doc,
                "items": item,
                "title": title,
                "url": filing_archive_url(cik, accession, doc),
            }
    return None


def exhibit_index_url(cik: str, accession: str) -> str:
    cik_int = str(int(cik))
    acc_nodash = (accession or "").replace("-", "")
    return ARCHIVE_INDEX_URL.format(cik_int=cik_int, acc_nodash=acc_nodash)


def exhibit_99_1_name(index_payload: Any) -> str | None:
    if not isinstance(index_payload, dict):
        return None
    directory = (
        index_payload.get("directory")
        if isinstance(index_payload.get("directory"), dict)
        else {}
    )
    items = directory.get("item")
    if isinstance(items, dict):
        rows = [items]
    elif isinstance(items, list):
        rows = items
    else:
        return None
    scored: list[str] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name") or "").strip()
        if not name or name.lower().endswith(".xml"):
            continue
        typ = str(row.get("type") or "").upper()
        if "99.1" in typ or re.search(r"ex[-_]?99[-._]?1", name, re.I):
            return name
        if "EX-99" in typ or _EX99.search(name):
            scored.append(name)
    return scored[0] if scored else None


def strip_filing_html(raw: str) -> str:
    text = _SCRIPT.sub(" ", raw or "")
    text = _STYLE.sub(" ", text)
    text = _TAG.sub(" ", text)
    text = html.unescape(text)
    return " ".join(text.split())[:EXHIBIT_TEXT_CHARS]
