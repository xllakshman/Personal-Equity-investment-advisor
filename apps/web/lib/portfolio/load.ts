import { createClient } from "@/lib/supabase/server";

import { asDisplayCurrency, type HoldingGridRow } from "./grid";
import type { NativeCurrency } from "./exchange";

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

export async function loadPortfolioSettings(
  familyId: string,
): Promise<PortfolioSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolios")
    .select("id, display_currency, fx_usd_inr_override")
    .eq("family_id", familyId)
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
): Promise<HoldingGridRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holdings")
    .select(
      "ticker, company_name, exchange, qty, cost_per_share, native_currency, lot_count",
    )
    .eq("family_id", familyId)
    .order("ticker");

  return (data ?? []).map((h) => ({
    ticker: String(h.ticker),
    company_name: h.company_name ? String(h.company_name) : null,
    exchange: String(h.exchange ?? ""),
    qty: Number(h.qty ?? 0),
    cost_per_share: Number(h.cost_per_share ?? 0),
    native_currency: String(h.native_currency ?? "USD"),
    lot_count: Number(h.lot_count ?? 1),
  }));
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
