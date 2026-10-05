import { createClient } from "@/lib/supabase/server";

import { asDisplayCurrency, type HoldingGridRow } from "./grid";
import type { NativeCurrency } from "./exchange";
import {
  asLotKind,
  missingLotKindColumn,
  type LotKind,
} from "./lot-kind";

export type PortfolioSettings = {
  portfolioId: string | null;
  displayCurrency: NativeCurrency;
  fxUsdInrOverride: number | null;
};

export type RejectedImport = {
  ticker: string | null;
  reject_reason: string | null;
  created_at: string;
};

export type HoldingLotRow = {
  id: string;
  ticker: string;
  company_name: string | null;
  exchange: string;
  qty: number;
  cost_per_share: number;
  native_currency: string;
};

export type HoldingsSelectError = {
  code?: string;
  message?: string;
} | null;

export type HoldingsSelectRow = {
  ticker?: unknown;
  company_name?: unknown;
  exchange?: unknown;
  qty?: unknown;
  cost_per_share?: unknown;
  native_currency?: unknown;
  lot_count?: unknown;
  lot_kind?: unknown;
};

type HoldingsSelectResult = {
  data: unknown;
  error: HoldingsSelectError;
};

type HoldingsSelectFn = (
  columns: string,
) => PromiseLike<HoldingsSelectResult>;

export const HOLDINGS_COLS_WITH_KIND =
  "ticker, company_name, exchange, qty, cost_per_share, native_currency, lot_count, lot_kind";
export const HOLDINGS_COLS =
  "ticker, company_name, exchange, qty, cost_per_share, native_currency, lot_count";

export type HoldingsGridLoad = {
  rows: HoldingGridRow[];
  lotKindColumnPresent: boolean;
};

function mapHoldingRows(
  data: HoldingsSelectRow[],
  forceKind?: LotKind,
): HoldingGridRow[] {
  return data.map((h) => ({
    ticker: String(h.ticker),
    company_name: h.company_name ? String(h.company_name) : null,
    exchange: String(h.exchange ?? ""),
    qty: Number(h.qty ?? 0),
    cost_per_share: Number(h.cost_per_share ?? 0),
    native_currency: String(h.native_currency ?? "USD"),
    lot_count: Number(h.lot_count ?? 1),
    lot_kind: forceKind ?? asLotKind(h.lot_kind),
  }));
}

/**
 * SELECT view holdings. Tries lot_kind (028); if the column is missing, retries
 * without it and treats every row as Retail. Never 500s on pre-028 databases.
 */
export async function selectHoldingsRows(
  runSelect: HoldingsSelectFn,
): Promise<HoldingsGridLoad> {
  const withKind = await runSelect(HOLDINGS_COLS_WITH_KIND);
  if (!withKind.error || !missingLotKindColumn(withKind.error)) {
    return {
      lotKindColumnPresent: !withKind.error,
      rows: mapHoldingRows(asHoldingRows(withKind.data)),
    };
  }
  const without = await runSelect(HOLDINGS_COLS);
  return {
    lotKindColumnPresent: false,
    rows: mapHoldingRows(asHoldingRows(without.data), "retail"),
  };
}

function asHoldingRows(data: unknown): HoldingsSelectRow[] {
  return Array.isArray(data) ? (data as HoldingsSelectRow[]) : [];
}

export async function loadPortfolioSettings(
  familyId: string,
): Promise<PortfolioSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolios")
    .select("id, display_currency, fx_usd_inr_override")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const fxRaw = data?.fx_usd_inr_override;
  const fx =
    fxRaw === null || fxRaw === undefined ? null : Number(fxRaw);

  return {
    portfolioId: data?.id ? String(data.id) : null,
    displayCurrency: asDisplayCurrency(
      data?.display_currency ? String(data.display_currency) : null,
    ),
    fxUsdInrOverride: fx !== null && Number.isFinite(fx) && fx > 0 ? fx : null,
  };
}

export async function loadHoldingsGrid(
  familyId: string,
): Promise<HoldingsGridLoad> {
  const supabase = await createClient();
  return selectHoldingsRows((columns) =>
    supabase.from("holdings").select(columns).eq("family_id", familyId).order("ticker"),
  );
}

export async function loadRecentRejected(
  familyId: string,
): Promise<RejectedImport[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_import_rows")
    .select("ticker, reject_reason, created_at")
    .eq("family_id", familyId)
    .eq("accepted", false)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((r) => ({
    ticker: r.ticker ? String(r.ticker) : null,
    reject_reason: r.reject_reason ? String(r.reject_reason) : null,
    created_at: String(r.created_at),
  }));
}

export async function loadHoldingLots(
  familyId: string,
): Promise<HoldingLotRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holding_lots")
    .select("id, ticker, company_name, exchange, qty, cost_per_share, native_currency")
    .eq("family_id", familyId)
    .order("ticker");

  return (data ?? []).map((h) => ({
    id: String(h.id),
    ticker: String(h.ticker),
    company_name: h.company_name ? String(h.company_name) : null,
    exchange: String(h.exchange ?? ""),
    qty: Number(h.qty ?? 0),
    cost_per_share: Number(h.cost_per_share ?? 0),
    native_currency: String(h.native_currency ?? "USD"),
  }));
}
