import { createClient } from "@/lib/supabase/server";
import { normalizeTicker } from "@/lib/desk/ticker";
import { isNativeProvider, type CatalogModel } from "./models";

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
};

export async function loadAnalyseBuilder(
  familyId: string,
  userId: string,
  rawTicker: string,
): Promise<BuilderPayload> {
  const ticker = normalizeTicker(rawTicker);
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
    planName = plan?.name ? String(plan.name) : planName;
    allowedModelIds = Array.isArray(plan?.allowed_model_ids)
      ? plan.allowed_model_ids.map((x) => String(x))
      : [];
  }

  const { data: catalog } = await supabase
    .from("model_catalog")
    .select("id, label, provider, vendor_class, thesis_class, cost_cents_per_run, is_active")
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
    }));

  const { data: userRow } = await supabase
    .from("users")
    .select("tax_residency, tax_slab")
    .eq("id", userId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("investor_profiles")
    .select("ltcg_holding_months, ltcg_rate_bps, stcg_rate_bps")
    .eq("family_id", familyId)
    .maybeSingle();

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
  };
}
