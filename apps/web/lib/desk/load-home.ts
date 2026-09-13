import {
  allocationWeights,
  costBasisNative,
  lastCheckedLabel,
  type HoldingRow,
} from "@/lib/desk/home-math";
import { createClient } from "@/lib/supabase/server";

export type DeskHome = {
  positions: number;
  analysesThisCycle: number;
  analysisLimit: number | null;
  planName: string | null;
  costBasis: number;
  costCurrency: string;
  holdings: (HoldingRow & { weightPct: number; lastChecked: string })[];
  recentNotes: {
    id: string;
    ticker: string;
    name: string;
    verdict: string;
    createdAt: string;
  }[];
};

function monthStartUtc(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function loadDeskHome(familyId: string): Promise<DeskHome> {
  const supabase = await createClient();
  const period = monthStartUtc();

  const [holdingsRes, usageRes, reportsRes, familyRes] = await Promise.all([
    supabase
      .from("holdings")
      .select("ticker, company_name, qty, cost_per_share, native_currency")
      .eq("family_id", familyId)
      .order("ticker"),
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("kind", "search")
      .eq("billing_period", period),
    supabase
      .from("reports")
      .select("id, ticker, name, verdict, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("families").select("plan_id").eq("id", familyId).maybeSingle(),
  ]);

  let planName: string | null = null;
  let analysisLimit: number | null = null;
  const planId = familyRes.data?.plan_id as string | null | undefined;
  if (planId) {
    const { data: plan } = await supabase
      .from("plans")
      .select("name, monthly_analysis_limit")
      .eq("id", planId)
      .maybeSingle();
    planName = plan?.name ?? null;
    analysisLimit =
      typeof plan?.monthly_analysis_limit === "number"
        ? plan.monthly_analysis_limit
        : null;
  }

  const rawHoldings = holdingsRes.data ?? [];
  const reports = reportsRes.data ?? [];
  const latestByTicker = new Map<string, string>();
  for (const r of reports) {
    const t = String(r.ticker);
    if (!latestByTicker.has(t)) latestByTicker.set(t, String(r.created_at));
  }

  const holdings: HoldingRow[] = rawHoldings.map((h) => ({
    ticker: String(h.ticker),
    company_name: h.company_name ? String(h.company_name) : null,
    qty: Number(h.qty ?? 0),
    cost_per_share: Number(h.cost_per_share ?? 0),
    native_currency: String(h.native_currency ?? "USD"),
    last_checked_at: latestByTicker.get(String(h.ticker)) ?? null,
  }));

  const weights = allocationWeights(holdings);
  const weightMap = new Map(weights.map((w) => [w.ticker, w.pct]));

  const currencies = new Set(holdings.map((h) => h.native_currency));
  const costCurrency = currencies.size === 1 ? [...currencies][0] : "mixed";

  return {
    positions: holdings.length,
    analysesThisCycle: usageRes.count ?? 0,
    analysisLimit,
    planName,
    costBasis: costBasisNative(holdings),
    costCurrency,
    holdings: holdings.map((h) => ({
      ...h,
      weightPct: weightMap.get(h.ticker) ?? 0,
      lastChecked: lastCheckedLabel(h.last_checked_at),
    })),
    recentNotes: reports.map((r) => ({
      id: String(r.id),
      ticker: String(r.ticker),
      name: String(r.name),
      verdict: String(r.verdict),
      createdAt: String(r.created_at),
    })),
  };
}
