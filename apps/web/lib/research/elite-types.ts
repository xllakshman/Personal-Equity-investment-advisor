import { ELITE_INVESTORS, type EliteCatalogRow } from "./elite-catalog";
import type { HoldingRow } from "./sec-13f";
import type { PeriodReturns } from "./cagr";

export type EliteReturns = PeriodReturns & {
  vehicleTicker: string | null;
  vehicleNote: string;
};

export type EliteInvestorBook = {
  slug: string;
  name: string;
  firm: string;
  cik: string | null;
  filingAsOf: string | null;
  filingUrl: string | null;
  holdings: HoldingRow[];
  holdingsNote: string | null;
  returns: EliteReturns;
  refreshedAt: string | null;
  error: string | null;
};

export type EliteSnapshot = {
  investors: EliteInvestorBook[];
  generatedAt: string | null;
};

export function emptyBook(row: EliteCatalogRow): EliteInvestorBook {
  return {
    slug: row.slug,
    name: row.name,
    firm: row.firm,
    cik: row.cik,
    filingAsOf: null,
    filingUrl: null,
    holdings: [],
    holdingsNote: row.cik
      ? "Click Refresh to pull the latest 13F from SEC EDGAR. This page does not fetch on load."
      : row.vehicleNote,
    returns: {
      vehicleTicker: row.vehicleTicker,
      vehicleNote: row.vehicleNote,
      y1: null,
      y3: null,
      y5: null,
      y10: null,
      asOf: null,
    },
    refreshedAt: null,
    error: null,
  };
}

export function emptySnapshot(): EliteSnapshot {
  return {
    investors: ELITE_INVESTORS.map(emptyBook),
    generatedAt: null,
  };
}

export function mergeBook(snap: EliteSnapshot, next: EliteInvestorBook): EliteSnapshot {
  return {
    generatedAt: next.refreshedAt ?? snap.generatedAt,
    investors: snap.investors.map((row) => (row.slug === next.slug ? next : row)),
  };
}
