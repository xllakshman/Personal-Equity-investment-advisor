import { planCardTitle } from "@/lib/billing/plan-titles";
import {
  allocationWeights,
  costBasisNative,
  lastCheckedLabel,
  type HoldingRow,
} from "@/lib/desk/home-math";
import { meterEventCount } from "@/lib/desk/usage-meter";
import { createClient } from "@/lib/supabase/server";

export type SupportGrantStatus = {
  active: boolean;
  expiresAt: string | null;
};

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
  supportGrant: SupportGrantStatus;
};

function monthStartUtc(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function loadDeskHome(familyId: string): Promise<DeskHome> {
  const supabase = await createClient();
  const period = monthStartUtc();

  const nowIso = new Date().toISOString();
  const [holdingsRes, usageRes, reportsRes, familyRes, grantRes] = await Promise.all([
    supabase
      .from("holdings")
      .select("ticker, company_name, qty, cost_per_share, native_currency, exchange")
      .eq("family_id", familyId)
      .order("ticker"),
    supabase
      .from("usage_events")
      .select("kind")
      .eq("family_id", familyId)
      .eq("billing_period", period),
    supabase
      .from("reports")
      .select("id, ticker, name, verdict, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("families").select("plan_id").eq("id", familyId).maybeSingle(),
    supabase
      .from("support_access_grants")
      .select("expires_at")
      .eq("family_id", familyId)
      .gt("expires_at", nowIso)
      .order("expires_at", { ascending: false })
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
    exchange: String(h.exchange ?? ""),
    last_checked_at: latestByTicker.get(String(h.ticker)) ?? null,
  }));

  const weights = allocationWeights(holdings);
  const weightMap = new Map(weights.map((w) => [w.ticker, w.pct]));

  const currencies = new Set(holdings.map((h) => h.native_currency));
  const costCurrency = currencies.size === 1 ? [...currencies][0] : "mixed";

  return {
    positions: holdings.length,
    analysesThisCycle: meterEventCount(
      (usageRes.data ?? []).map((row) => String(row.kind ?? "")),
    ),
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
    supportGrant: grantRes.data?.expires_at
      ? { active: true, expiresAt: String(grantRes.data.expires_at) }
      : { active: false, expiresAt: null },
  };
}
