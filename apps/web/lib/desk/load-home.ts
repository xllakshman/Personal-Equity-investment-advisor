import { parseOutsideBook } from "@/lib/profile/defaults";
import { planCardTitle } from "@/lib/billing/plan-titles";
import { deskFlags, type DeskFlag } from "@/lib/desk/flags";
import {
  allocationWeights,
  costBasisNative,
  lastCheckedLabel,
  type HoldingRow,
} from "@/lib/desk/home-math";
import { loadPortfolioTrend, type PortfolioTrendPayload } from "@/lib/desk/load-portfolio-trend";
import {
  meterEventsFromUsageRows,
  selectUsageEventsForMeter,
} from "@/lib/desk/load-usage-events";
import { meterCreditSum } from "@/lib/desk/usage-meter";
import type { QuotePoint } from "@/lib/market/book-rows";
import { loadHoldingQuotes } from "@/lib/market/load-quotes";
import { asDisplayCurrency } from "@/lib/portfolio/grid";
import { displayFxRate } from "@/lib/portfolio/fx";
import type { NativeCurrency } from "@/lib/portfolio/exchange";
import { splitByLotKind } from "@/lib/portfolio/lot-kind";
import { selectHoldingsRows } from "@/lib/portfolio/load";
import {
  aggregateUnrealizedPct,
  holdingDisplayPnl,
} from "@/lib/portfolio/unrealized-pnl";
import { createClient } from "@/lib/supabase/server";

export type SupportGrantStatus = {
  active: boolean;
  expiresAt: string | null;
};

export type DeskHomeHolding = HoldingRow & {
  weightPct: number;
  lastChecked: string;
};

export type DeskHome = {
  positions: number;
  analysesThisCycle: number;
  analysisLimit: number | null;
  planName: string | null;
  costBasis: number;
  costCurrency: string;
  holdings: DeskHomeHolding[];
  quotes: Record<string, QuotePoint | null>;
  displayCurrency: NativeCurrency;
  fxUsdInr: number;
  unrealizedPnlPct: number | null;
  retailPnlPct: number | null;
  esopPnlPct: number | null;
  lotKindColumnPresent: boolean;
  recentNotes: {
    id: string;
    ticker: string;
    name: string;
    verdict: string;
    createdAt: string;
  }[];
  savedNotesCount: number;
  sampleCount: number;
  supportGrant: SupportGrantStatus;
  flags: DeskFlag[];
  trend: PortfolioTrendPayload;
};

function monthStartUtc(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function sleevePct(
  rows: HoldingRow[],
  quotes: Record<string, QuotePoint | null>,
  displayCurrency: NativeCurrency,
  fxUsdInr: number,
): number | null {
  return aggregateUnrealizedPct(
    rows.map((h) =>
      holdingDisplayPnl({
        qty: h.qty,
        costPerShare: h.cost_per_share,
        nativeCurrency: h.native_currency,
        quote: quotes[h.ticker],
        displayCurrency,
        fxUsdInr,
      }),
    ),
  );
}

export async function loadDeskHome(familyId: string): Promise<DeskHome> {
  const supabase = await createClient();
  const period = monthStartUtc();

  const nowIso = new Date().toISOString();
  const [holdingsLoad, usageRes, reportsRes, familyRes, grantRes, profileRes, portfolioRes] =
    await Promise.all([
    selectHoldingsRows((columns) =>
      supabase
        .from("holdings")
        .select(columns)
        .eq("family_id", familyId)
        .order("ticker"),
    ),
    selectUsageEventsForMeter((columns) =>
      supabase
        .from("usage_events")
        .select(columns)
        .eq("family_id", familyId)
        .eq("billing_period", period),
    ),
    supabase
      .from("reports")
      .select("id, ticker, name, verdict, created_at, is_library_sample")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false }),
    supabase.from("families").select("plan_id").eq("id", familyId).maybeSingle(),
    supabase
      .from("support_access_grants")
      .select("expires_at")
      .eq("family_id", familyId)
      .gt("expires_at", nowIso)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("investor_profiles")
      .select("cash_reserve_pct_min, concentration_cap_pct, outside_book")
      .eq("family_id", familyId)
      .maybeSingle(),
    supabase
      .from("portfolios")
      .select("display_currency, fx_usd_inr_override")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  let planName: string | null = null;
  let analysisLimit: number | null = null;
  const planId = familyRes.data?.plan_id as string | null | undefined;
  if (planId) {
    const { data: plan } = await supabase
      .from("plans")
      .select("name, slug, monthly_analysis_limit")
      .eq("id", planId)
      .maybeSingle();
    planName = planCardTitle(String(plan?.slug ?? ""), String(plan?.name ?? "Trial"));
    analysisLimit =
      typeof plan?.monthly_analysis_limit === "number"
        ? plan.monthly_analysis_limit
        : null;
  }

  const reports = reportsRes.data ?? [];
  const ownReports = reports.filter((r) => !r.is_library_sample);
  const sampleCount = reports.filter((r) => r.is_library_sample).length;
  const latestByTicker = new Map<string, string>();
  for (const r of reports) {
    const t = String(r.ticker);
    if (!latestByTicker.has(t)) latestByTicker.set(t, String(r.created_at));
  }

  const holdings: HoldingRow[] = holdingsLoad.rows.map((h) => ({
    ticker: h.ticker,
    company_name: h.company_name,
    qty: h.qty,
    cost_per_share: h.cost_per_share,
    native_currency: h.native_currency,
    exchange: h.exchange,
    last_checked_at: latestByTicker.get(h.ticker) ?? null,
    lot_kind: h.lot_kind,
  }));

  const weights = allocationWeights(holdings);
  const mappedHoldings = holdings.map((h, i) => ({
    ...h,
    weightPct: weights[i]?.pct ?? 0,
    lastChecked: lastCheckedLabel(h.last_checked_at),
  }));
  const byTickerWeight = new Map<string, number>();
  for (const h of mappedHoldings) {
    byTickerWeight.set(h.ticker, (byTickerWeight.get(h.ticker) ?? 0) + h.weightPct);
  }
  const cashMinPct = Number(profileRes.data?.cash_reserve_pct_min ?? 10);
  const concentrationCapPct = Number(
    profileRes.data?.concentration_cap_pct ?? 15,
  );
  const cash = parseOutsideBook(profileRes.data?.outside_book).cash;
  const fxRaw = portfolioRes.data?.fx_usd_inr_override;
  const fx =
    fxRaw === null || fxRaw === undefined ? null : Number(fxRaw);
  const displayCurrency = asDisplayCurrency(
    portfolioRes.data?.display_currency
      ? String(portfolioRes.data.display_currency)
      : null,
  );
  const fxUsdInr = displayFxRate(fx !== null && Number.isFinite(fx) && fx > 0 ? fx : null);
  const [trend, quotes] = await Promise.all([
    loadPortfolioTrend(
      mappedHoldings,
      displayCurrency,
      fx !== null && Number.isFinite(fx) && fx > 0 ? fx : null,
    ),
    loadHoldingQuotes(mappedHoldings),
  ]);
  const { retail, esop } = splitByLotKind(holdings);
  const currencies = new Set(holdings.map((h) => h.native_currency));
  const costCurrency = currencies.size === 1 ? [...currencies][0] : "mixed";
  const costBasis = costBasisNative(holdings);

  return {
    positions: holdings.length,
    analysesThisCycle: meterCreditSum(meterEventsFromUsageRows(usageRes)),
    analysisLimit,
    planName,
    costBasis,
    costCurrency,
    holdings: mappedHoldings,
    quotes,
    displayCurrency,
    fxUsdInr,
    unrealizedPnlPct: sleevePct(holdings, quotes, displayCurrency, fxUsdInr),
    retailPnlPct: sleevePct(retail, quotes, displayCurrency, fxUsdInr),
    esopPnlPct: sleevePct(esop, quotes, displayCurrency, fxUsdInr),
    lotKindColumnPresent: holdingsLoad.lotKindColumnPresent,
    recentNotes: ownReports.slice(0, 1).map((r) => ({
      id: String(r.id),
      ticker: String(r.ticker),
      name: String(r.name),
      verdict: String(r.verdict),
      createdAt: String(r.created_at),
    })),
    savedNotesCount: ownReports.length,
    sampleCount,
    supportGrant: grantRes.data?.expires_at
      ? { active: true, expiresAt: String(grantRes.data.expires_at) }
      : { active: false, expiresAt: null },
    flags: deskFlags({
      costBasis,
      cash,
      cashMinPct,
      concentrationCapPct,
      holdings: [...byTickerWeight.entries()].map(([ticker, weightPct]) => ({
        ticker,
        weightPct,
      })),
    }),
    trend,
  };
}
