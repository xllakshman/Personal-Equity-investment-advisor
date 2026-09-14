import { meterEventCount, quotaExhausted } from "@/lib/desk/usage-meter";
import { createClient } from "@/lib/supabase/server";

import type { UsageSnapshot } from "./types";

export type { UsageSnapshot } from "./types";
export { usageCaption } from "./format";

function monthStartUtc(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function loadUsageSnapshot(familyId: string): Promise<UsageSnapshot> {
  const supabase = await createClient();
  const period = monthStartUtc();

  const [usageRes, familyRes, walletRes] = await Promise.all([
    supabase
      .from("usage_events")
      .select("kind, cost_cents")
      .eq("family_id", familyId)
      .eq("billing_period", period),
    supabase.from("families").select("plan_id").eq("id", familyId).maybeSingle(),
    supabase.from("wallets").select("balance_cents").eq("family_id", familyId).maybeSingle(),
  ]);

  let planName: string | null = null;
  let planSlug: string | null = null;
  let limit: number | null = null;
  let notices: { pct: number; message: string }[] = [];
  const planId = familyRes.data?.plan_id as string | null | undefined;
  if (planId) {
    const { data: plan } = await supabase
      .from("plans")
      .select("name, slug, monthly_analysis_limit")
      .eq("id", planId)
      .maybeSingle();
    planName = plan?.name ?? null;
    planSlug = plan?.slug ? String(plan.slug) : null;
    limit =
      typeof plan?.monthly_analysis_limit === "number" ? plan.monthly_analysis_limit : null;
    const { data: thresholds } = await supabase
      .from("plan_notice_thresholds")
      .select("pct, message")
      .eq("plan_id", planId)
      .order("pct");
    notices = (thresholds ?? []).map((t) => ({
      pct: Number(t.pct),
      message: String(t.message),
    }));
  }

  const used = meterEventCount((usageRes.data ?? []).map((row) => String(row.kind ?? "")));
  const costCents = (usageRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.cost_cents ?? 0),
    0,
  );
  const exhausted = quotaExhausted(used, limit);
  const pctUsed = limit && limit > 0 ? (used / limit) * 100 : 0;
  const activeNotices = notices.filter((n) => pctUsed >= n.pct);

  return {
    used,
    limit,
    planName,
    planSlug,
    walletCents: Number(walletRes.data?.balance_cents ?? 0),
    costCents,
    notices: activeNotices,
    exhausted,
  };
}
