import { planCardTitle } from "@/lib/billing/plan-titles";
import { createClient } from "@/lib/supabase/server";
import { tickerSearchTarget } from "@/lib/desk/ticker";
import { assignNoteVersions } from "@/lib/reports/versions";
import { isNativeProvider, type CatalogModel } from "./models";
import { IN_FLIGHT_STATUSES, type InFlightAnalysis } from "./in-flight";

export type HeldLot = {
  ticker: string;
  company_name: string | null;
  qty: number;
  cost_per_share: number;
  native_currency: string;
  exchange: string;
};

export type BuilderPayload = {
  ticker: string;
  held: HeldLot | null;
  holdings: HeldLot[];
  invested: number;
  portfolioSize: number;
  currency: string;
  models: CatalogModel[];
  allowedModelIds: string[];
  planSlug: string;
  planName: string;
  taxResidency: string;
  taxSlab: string | null;
  ltcgHoldingMonths: number | null;
  ltcgRateBps: number | null;
  stcgRateBps: number | null;
  entryTranches: {
    tranche_t1_pct: number;
    tranche_t2_pct: number;
    tranche_t3_pct: number;
    tranche_t4_pct: number;
  } | null;
  inFlight: InFlightAnalysis | null;
  priorNotes: PriorNote[];
  latestNote: LatestBuilderNote | null;
};

export type LatestBuilderNote = {
  id: string;
  name: string;
  ticker: string;
  verdict: string;
  sections: Record<string, unknown>;
  version: number | null;
  versionCount: number;
};

export type PriorNote = {
  id: string;
  ticker: string;
  name: string;
  createdAt: string;
  version: number | null;
  versionCount: number;
};

export async function loadAnalyseBuilder(
  familyId: string,
  userId: string,
  rawTicker: string,
): Promise<BuilderPayload> {
  const wanted = tickerSearchTarget(rawTicker);
  const ticker = wanted.kind === "analyse" ? wanted.ticker : "";
  const supabase = await createClient();

  const { data: holdingRows } = await supabase
    .from("holdings")
    .select("ticker, company_name, qty, cost_per_share, native_currency, exchange")
    .eq("family_id", familyId);

  const rows = (holdingRows ?? []).map((h) => ({
    ticker: String(h.ticker),
    company_name: h.company_name ? String(h.company_name) : null,
    qty: Number(h.qty ?? 0),
    cost_per_share: Number(h.cost_per_share ?? 0),
    native_currency: String(h.native_currency ?? "USD"),
    exchange: String(h.exchange ?? ""),
  }));

  const held = ticker ? (rows.find((r) => r.ticker === ticker) ?? null) : null;
  const invested = held ? held.qty * held.cost_per_share : 0;
  const portfolioSize = rows.reduce((s, r) => s + r.qty * r.cost_per_share, 0);
  const currency = held?.native_currency ?? "USD";
  const holdings = rows;

  const { data: family } = await supabase
    .from("families")
    .select("plan_id")
    .eq("id", familyId)
    .maybeSingle();

  let allowedModelIds: string[] = [];
  let planSlug = "trial";
  let planName = "Trial";
  const planId = family?.plan_id ? String(family.plan_id) : null;
  if (planId) {
    const { data: plan } = await supabase
      .from("plans")
      .select("slug, name, allowed_model_ids")
      .eq("id", planId)
      .maybeSingle();
    planSlug = plan?.slug ? String(plan.slug) : planSlug;
    planName = planCardTitle(planSlug, plan?.name ? String(plan.name) : "Trial");
    allowedModelIds = Array.isArray(plan?.allowed_model_ids)
      ? plan.allowed_model_ids.map((x) => String(x))
      : [];
  }

  const { data: catalog } = await supabase
    .from("model_catalog")
    .select(
      "id, label, provider, vendor_class, thesis_class, cost_cents_per_run, min_plan_slug, is_active",
    )
    .eq("is_active", true)
    .order("sort_order");

  const models: CatalogModel[] = (catalog ?? [])
    .filter((m) => isNativeProvider(String(m.provider)))
    .filter((m) => m.thesis_class === "frontier" || m.thesis_class === "quick")
    .map((m) => ({
      id: String(m.id),
      label: String(m.label),
      provider: String(m.provider),
      vendor_class: String(m.vendor_class ?? ""),
      thesis_class: m.thesis_class === "frontier" ? "frontier" : "quick",
      cost_cents_per_run: Number(m.cost_cents_per_run ?? 0),
      min_plan_slug: String(m.min_plan_slug ?? "trial"),
    }));

  const { data: userRow } = await supabase
    .from("users")
    .select("tax_residency, tax_slab")
    .eq("id", userId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("investor_profiles")
    .select(
      "ltcg_holding_months, ltcg_rate_bps, stcg_rate_bps, tranche_t1_pct, tranche_t2_pct, tranche_t3_pct, tranche_t4_pct",
    )
    .eq("family_id", familyId)
    .maybeSingle();

  const { data: busyRow } = await supabase
    .from("analysis_requests")
    .select("id, ticker, status")
    .eq("family_id", familyId)
    .in("status", [...IN_FLIGHT_STATUSES])
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: reportRows } = await supabase
    .from("reports")
    .select("id, ticker, name, created_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  const priorNotes: PriorNote[] = assignNoteVersions(
    (reportRows ?? []).map((r) => ({
      id: String(r.id),
      ticker: String(r.ticker),
      name: String(r.name),
      lastRun: String(r.created_at),
      kind: "note" as const,
    })),
  ).map((r) => ({
    id: r.id,
    ticker: r.ticker,
    name: r.name,
    createdAt: r.lastRun,
    version: r.version,
    versionCount: r.versionCount,
  }));

  let latestNote: LatestBuilderNote | null = null;
  const noteQuery = supabase
    .from("reports")
    .select("id, ticker, name, verdict, sections, created_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(1);
  const { data: latestRows } = ticker
    ? await noteQuery.eq("ticker", ticker)
    : await noteQuery;
  const latest = latestRows?.[0];
  if (latest) {
    const sections =
      latest.sections && typeof latest.sections === "object" && !Array.isArray(latest.sections)
        ? (latest.sections as Record<string, unknown>)
        : {};
    const numbered = priorNotes.find((n) => n.id === String(latest.id));
    latestNote = {
      id: String(latest.id),
      name: String(latest.name),
      ticker: String(latest.ticker),
      verdict: String(latest.verdict ?? ""),
      sections,
      version: numbered?.version ?? null,
      versionCount: numbered?.versionCount ?? 1,
    };
  }

  return {
    ticker,
    held,
    holdings,
    invested,
    portfolioSize,
    currency,
    models,
    allowedModelIds,
    planSlug,
    planName,
    taxResidency: userRow?.tax_residency ? String(userRow.tax_residency) : "us",
    taxSlab: userRow?.tax_slab ? String(userRow.tax_slab) : null,
    ltcgHoldingMonths:
      profile?.ltcg_holding_months == null ? null : Number(profile.ltcg_holding_months),
    ltcgRateBps: profile?.ltcg_rate_bps == null ? null : Number(profile.ltcg_rate_bps),
    stcgRateBps: profile?.stcg_rate_bps == null ? null : Number(profile.stcg_rate_bps),
    entryTranches: profile
      ? {
          tranche_t1_pct: Number(profile.tranche_t1_pct ?? 35),
          tranche_t2_pct: Number(profile.tranche_t2_pct ?? 25),
          tranche_t3_pct: Number(profile.tranche_t3_pct ?? 25),
          tranche_t4_pct: Number(profile.tranche_t4_pct ?? 15),
        }
      : null,
    inFlight: busyRow?.id
      ? {
          id: String(busyRow.id),
          ticker: String(busyRow.ticker),
          status: String(busyRow.status),
        }
      : null,
    priorNotes,
    latestNote,
  };
}
