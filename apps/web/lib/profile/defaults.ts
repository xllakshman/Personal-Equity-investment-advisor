export type TaxResidency = "us" | "india" | "uae" | "nri";

export type BlackoutWindow = {
  label: string;
  start: string;
  end: string;
};

export type OutsideBook = {
  cash: number | null;
  gold: number | null;
  house: number | null;
  unlisted: number | null;
};

export type InvestorProfileKnobs = {
  cannot_trade_us_options: boolean;
  monitor_per_week: number;
  horizon_years: number;
  cash_reserve_pct_min: number;
  cash_reserve_pct_max: number;
  concentration_cap_pct: number;
  trim_to_pct: number;
  tranche_t1_pct: number;
  tranche_t2_pct: number;
  tranche_t3_pct: number;
  tranche_t4_pct: number;
  position_size_min_pct: number;
  position_size_max_pct: number;
  ltcg_holding_months: number;
  ltcg_rate_bps: number;
  stcg_rate_bps: number;
  outside_book: OutsideBook;
  lrs_enabled: boolean;
  lrs_annual_cap_usd: number | null;
  blackout_windows: BlackoutWindow[];
  timezone: string;
};

const EMPTY_BOOK: OutsideBook = {
  cash: null,
  gold: null,
  house: null,
  unlisted: null,
};

export function parseTaxResidency(raw: string | null | undefined): TaxResidency {
  if (raw === "india" || raw === "uae" || raw === "nri" || raw === "us") {
    return raw;
  }
  return "us";
}

export function showLrsFields(residency: string): boolean {
  return residency === "india";
}

export function defaultLtcgHoldingMonths(residency: string): number {
  return residency === "india" ? 24 : 12;
}

export function profileDefaults(residency: TaxResidency): InvestorProfileKnobs {
  const india = residency === "india";
  const gulf = residency === "uae";
  const indiaTax = residency === "india" || residency === "nri";
  return {
    cannot_trade_us_options: india,
    monitor_per_week: 1,
    horizon_years: 5,
    cash_reserve_pct_min: 10,
    cash_reserve_pct_max: 20,
    concentration_cap_pct: 15,
    trim_to_pct: 12,
    tranche_t1_pct: 35,
    tranche_t2_pct: 25,
    tranche_t3_pct: 25,
    tranche_t4_pct: 15,
    position_size_min_pct: 3,
    position_size_max_pct: 15,
    ltcg_holding_months: defaultLtcgHoldingMonths(residency),
    ltcg_rate_bps: gulf ? 0 : indiaTax ? 1250 : 1500,
    stcg_rate_bps: gulf ? 0 : indiaTax ? 2000 : 2200,
    outside_book: { ...EMPTY_BOOK },
    lrs_enabled: india,
    lrs_annual_cap_usd: null,
    blackout_windows: [],
    timezone: india || residency === "nri"
      ? "Asia/Kolkata"
      : gulf
        ? "Asia/Dubai"
        : "America/New_York",
  };
}

export function parseBlackoutWindows(raw: unknown): BlackoutWindow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const label = String(r.label ?? "").trim();
      const start = String(r.start ?? "").trim();
      const end = String(r.end ?? "").trim();
      if (!label && !start && !end) return null;
      return { label, start, end };
    })
    .filter((x): x is BlackoutWindow => x !== null);
}

export function parseOutsideBook(raw: unknown): OutsideBook {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_BOOK };
  }
  const r = raw as Record<string, unknown>;
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    cash: num(r.cash),
    gold: num(r.gold),
    house: num(r.house),
    unlisted: num(r.unlisted),
  };
}
