"""SEC companyfacts annual resolver (P11-14). Never stores full XBRL."""
from __future__ import annotations

from typing import Any

from thesis_platform.derived import excerpt_payload
from thesis_platform.edgar import NOT_COVERED

COMPANYFACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
MAX_YEARS = 10
US_STATUTORY_TAX = 0.21
FY_FORMS = frozenset({"10-K", "10-K/A", "20-F", "20-F/A", "40-F", "40-F/A"})

# Alias lists: first hit in us-gaap / ifrs-full / dei wins.
CONCEPTS: dict[str, tuple[str, ...]] = {
    "revenue": (
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet",
        "RevenueFromContractWithCustomerIncludingAssessedTax",
    ),
    "gross_profit": ("GrossProfit",),
    "operating_income": ("OperatingIncomeLoss",),
    "net_income": ("NetIncomeLoss", "ProfitLoss"),
    "ocf": (
        "NetCashProvidedByUsedInOperatingActivities",
        "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
    ),
    "capex": (
        "PaymentsToAcquirePropertyPlantAndEquipment",
        "PaymentsToAcquireProductiveAssets",
    ),
    "debt": (
        "LongTermDebt",
        "LongTermDebtAndCapitalLeaseObligations",
        "DebtAndCapitalLeaseObligations",
    ),
    "cash": (
        "CashAndCashEquivalentsAtCarryingValue",
        "CashCashEquivalentsAndShortTermInvestments",
        "Cash",
    ),
    "shares": (
        "CommonStockSharesOutstanding",
        "WeightedAverageNumberOfDilutedSharesOutstanding",
        "EntityCommonStockSharesOutstanding",
        "WeightedAverageNumberOfSharesOutstandingBasic",
    ),
    "equity": (
        "StockholdersEquity",
        "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ),
}

DEBT_PARTS: tuple[str, ...] = (
    "LongTermDebtNoncurrent",
    "LongTermDebtCurrent",
    "DebtCurrent",
    "ShortTermBorrowings",
    "CommercialPaper",
)

MONEY_UNITS = ("USD", "US$", "USD/shares")
SHARE_UNITS = ("shares", "pure")


def empty_fundamentals(status: str = NOT_COVERED) -> dict[str, Any]:
    return {
        "status": status,
        "cik": None,
        "entity": None,
        "concepts_used": {},
        "years": [],
    }


def fundamentals_from_evidence(evidence: list[Any] | None) -> dict[str, Any]:
    for row in evidence or []:
        if not isinstance(row, dict):
            continue
        query = str(row.get("query") or "").lower()
        if "companyfacts" not in query:
            continue
        payload = excerpt_payload(row.get("excerpt"))
        if payload.get("years") or payload.get("status"):
            return payload
    return empty_fundamentals()


def parse_companyfacts(payload: Any, cik: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return empty_fundamentals()
    facts = payload.get("facts")
    if not isinstance(facts, dict) or not facts:
        return empty_fundamentals()

    used: dict[str, str] = {}
    series: dict[str, dict[int, float]] = {}
    filed_by_fy: dict[int, str] = {}

    for field, aliases in CONCEPTS.items():
        units = SHARE_UNITS if field == "shares" else MONEY_UNITS
        name, by_fy = _resolve_field(facts, aliases, units)
        if field == "debt" and not by_fy:
            name, by_fy = _sum_debt_parts(facts)
        if not by_fy:
            continue
        used[field] = name
        series[field] = {fy: row["val"] for fy, row in by_fy.items()}
        for fy, row in by_fy.items():
            filed = str(row.get("filed") or "")
            if filed and filed >= filed_by_fy.get(fy, ""):
                filed_by_fy[fy] = filed

    fys = sorted({fy for vals in series.values() for fy in vals}, reverse=True)
    if not fys:
        return empty_fundamentals()

    years: list[dict[str, Any]] = []
    for fy in fys[:MAX_YEARS]:
        row = _year_row(fy, series, filed_by_fy.get(fy, ""))
        years.append(row)

    return {
        "status": "ok",
        "cik": cik,
        "entity": str(payload.get("entityName") or "")[:200] or None,
        "concepts_used": used,
        "years": years,
    }


def _year_row(
    fy: int,
    series: dict[str, dict[int, float]],
    filed: str,
) -> dict[str, Any]:
    revenue = series.get("revenue", {}).get(fy)
    gp = series.get("gross_profit", {}).get(fy)
    opinc = series.get("operating_income", {}).get(fy)
    ni = series.get("net_income", {}).get(fy)
    ocf = series.get("ocf", {}).get(fy)
    capex = series.get("capex", {}).get(fy)
    debt = series.get("debt", {}).get(fy)
    cash = series.get("cash", {}).get(fy)
    shares = series.get("shares", {}).get(fy)
    equity = series.get("equity", {}).get(fy)
    fcf = _fcf(ocf, capex)
    return {
        "fy": fy,
        "filed": filed or None,
        "revenue": revenue,
        "gross_profit": gp,
        "operating_income": opinc,
        "net_income": ni,
        "ocf": ocf,
        "capex": capex,
        "debt": debt,
        "cash": cash,
        "shares": shares,
        "equity": equity,
        "fcf": fcf,
        "gp_margin": _ratio(gp, revenue),
        "op_margin": _ratio(opinc, revenue),
        "ni_margin": _ratio(ni, revenue),
        "roic": _roic(opinc, equity, debt, cash),
    }


def _fcf(ocf: float | None, capex: float | None) -> float | None:
    if ocf is None or capex is None:
        return None
    return round(ocf - abs(capex), 4)


def _ratio(num: float | None, den: float | None) -> float | None:
    if num is None or den is None or den == 0:
        return None
    return round(num / den, 6)


def _roic(
    operating_income: float | None,
    equity: float | None,
    debt: float | None,
    cash: float | None,
) -> float | None:
    if operating_income is None or equity is None:
        return None
    invested = equity + (debt or 0.0) - (cash or 0.0)
    if invested <= 0:
        return None
    nopat = operating_income * (1.0 - US_STATUTORY_TAX)
    return round(nopat / invested, 6)


def _resolve_field(
    facts: dict[str, Any],
    aliases: tuple[str, ...],
    units: tuple[str, ...],
) -> tuple[str, dict[int, dict[str, Any]]]:
    for ns in ("us-gaap", "ifrs-full", "dei"):
        bucket = facts.get(ns)
        if not isinstance(bucket, dict):
            continue
        for name in aliases:
            concept = bucket.get(name)
            by_fy = _annual_by_fy(_unit_rows(concept, units))
            if by_fy:
                return name, by_fy
    return "", {}


def _sum_debt_parts(facts: dict[str, Any]) -> tuple[str, dict[int, dict[str, Any]]]:
    parts: list[dict[int, dict[str, Any]]] = []
    for name in DEBT_PARTS:
        found, by_fy = _resolve_field(facts, (name,), MONEY_UNITS)
        if found and by_fy:
            parts.append(by_fy)
    if not parts:
        return "", {}
    fys = set()
    for p in parts:
        fys.update(p)
    combined: dict[int, dict[str, Any]] = {}
    for fy in fys:
        vals = [p[fy]["val"] for p in parts if fy in p]
        if not vals:
            continue
        filed = max((p[fy].get("filed") or "" for p in parts if fy in p), default="")
        combined[fy] = {"fy": fy, "val": sum(vals), "filed": filed, "form": "10-K"}
    return "debt_parts_sum", combined


def _unit_rows(concept: Any, unit_names: tuple[str, ...]) -> list[Any]:
    if not isinstance(concept, dict):
        return []
    units = concept.get("units")
    if not isinstance(units, dict):
        return []
    out: list[Any] = []
    wanted = {u.lower() for u in unit_names}
    for key, rows in units.items():
        if str(key).lower() not in wanted:
            continue
        if isinstance(rows, list):
            out.extend(rows)
    if out:
        return out
    return []


def _annual_by_fy(rows: list[Any]) -> dict[int, dict[str, Any]]:
    best: dict[int, dict[str, Any]] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        fp = str(row.get("fp") or "").upper()
        form = str(row.get("form") or "").upper()
        if fp != "FY" or form not in FY_FORMS:
            continue
        try:
            fy = int(row.get("fy"))
            val = float(row.get("val"))
        except (TypeError, ValueError):
            continue
        if val != val:
            continue
        rank = 0 if form in {"10-K", "20-F", "40-F"} else 1
        filed = str(row.get("filed") or "")
        prev = best.get(fy)
        if (
            prev is None
            or rank < int(prev.get("rank") or 9)
            or (rank == int(prev.get("rank") or 9) and filed > str(prev.get("filed") or ""))
        ):
            best[fy] = {
                "fy": fy,
                "val": val,
                "filed": filed,
                "form": form,
                "rank": rank,
            }
    return best
