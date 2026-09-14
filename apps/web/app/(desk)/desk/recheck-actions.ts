"use server";

import { revalidatePath } from "next/cache";

import { canWriteFamily, requireDeskSession } from "@/lib/desk/session";
import { createClient } from "@/lib/supabase/server";

export type RecheckState = { error: string | null; notice: string | null };
export const EMPTY_RECHECK: RecheckState = { error: null, notice: null };

export async function recheckHoldings(
  _prev: RecheckState,
  formData: FormData,
): Promise<RecheckState> {
  const session = await requireDeskSession();
  if (!canWriteFamily(session)) {
    return { error: "Viewers cannot re-check.", notice: null };
  }
  const confirm = String(formData.get("confirm") ?? "") === "1";
  const tickers = String(formData.get("tickers") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const n = tickers.length;
  if (!confirm) {
    return {
      error: null,
      notice: `Re-check all without confirm does not insert rows. Confirm would queue ${n} names.`,
    };
  }
  const supabase = await createClient();
  const { data: family } = await supabase
    .from("families")
    .select("plan_id")
    .eq("id", session.familyId)
    .maybeSingle();
  let modelId = "opus5";
  if (family?.plan_id) {
    const { data: plan } = await supabase
      .from("plans")
      .select("allowed_model_ids")
      .eq("id", family.plan_id)
      .maybeSingle();
    const allowed = (plan?.allowed_model_ids as string[] | null) ?? [];
    if (allowed.includes("opus5")) modelId = "opus5";
    else if (allowed[0]) modelId = allowed[0];
  }
  const { data: profile } = await supabase
    .from("users")
    .select("tax_residency")
    .eq("id", session.userId)
    .maybeSingle();
  const tax = String(profile?.tax_residency ?? "us");
  let queued = 0;
  for (const ticker of tickers) {
    const { error } = await supabase.rpc("thesis_accept_analysis", {
      p_ticker: ticker,
      p_lenses: ["fundamental", "technical", "macro", "news"],
      p_invested_amount: 0,
      p_portfolio_size: 0,
      p_invested_currency: "USD",
      p_intent: "undecided",
      p_avg_down: "single_entry",
      p_risk: "medium_11_20",
      p_cagr: "medium_13_18",
      p_tax_residency: tax,
      p_tax_slab: null,
      p_model_id: modelId,
      p_clarifications: {},
      p_exchange: null,
    });
    if (error) {
      return { error: error.message, notice: queued ? `Queued ${queued} before failure.` : null };
    }
    queued += 1;
  }
  revalidatePath("/desk");
  revalidatePath("/usage");
  return { error: null, notice: `Queued ${queued} analysis_requests (kind search).` };
}
