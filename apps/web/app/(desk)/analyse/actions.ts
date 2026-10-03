"use server";

import {
  clarificationsPayload,
  parseAcceptFields,
  validateAcceptFields,
} from "@/lib/analyse/accept-fields";
import { type AcceptState } from "@/lib/analyse/accept-state";
import { type CancelState } from "@/lib/analyse/cancel-state";
import { parseAcceptError } from "@/lib/analyse/errors";
import { IN_FLIGHT_STATUSES } from "@/lib/analyse/in-flight";
import { canWriteFamily, getDeskSession } from "@/lib/desk/session";
import { createClient } from "@/lib/supabase/server";

function acceptFail(error: string): AcceptState {
  return { error, requestId: null };
}

export async function acceptAnalysis(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const session = await getDeskSession();
  if (!session) {
    return acceptFail("Sign in again at /login.");
  }
  if (!canWriteFamily(session)) {
    return acceptFail(parseAcceptError("THS-AUTH-001"));
  }
  const fields = parseAcceptFields(formData);
  const fieldError = validateAcceptFields(fields);
  if (fieldError) {
    return acceptFail(fieldError);
  }
  const taxSlab = String(formData.get("tax_slab") ?? "").trim() || null;
  const exchange = String(formData.get("exchange") ?? "").trim() || null;
  const currency = String(formData.get("invested_currency") ?? "USD").slice(0, 3) || "USD";
  const invested = Number(formData.get("invested_amount") ?? 0);
  const portfolio = Number(formData.get("portfolio_size") ?? 0);
  const intended = Number(formData.get("intended_investment") ?? 0);
  const runQty = Number(formData.get("run_qty") ?? 0);
  const runCost = Number(formData.get("run_cost_per_share") ?? 0);
  const clarifications = clarificationsPayload(
    fields.skipClarify,
    fields.conviction,
    fields.addFunds,
    fields.exitRule,
  );

  const supabase = await createClient();
  const { data: busyRows } = await supabase
    .from("analysis_requests")
    .select("id, ticker")
    .eq("family_id", session.familyId)
    .in("status", [...IN_FLIGHT_STATUSES])
    .order("accepted_at", { ascending: false })
    .limit(1);
  const busy = busyRows?.[0];
  if (busy?.id) {
    return { error: parseAcceptError("THS-BUSY-001"), requestId: String(busy.id) };
  }
  const { data, error } = await supabase.rpc("thesis_accept_analysis", {
    p_ticker: fields.ticker,
    p_lenses: fields.lenses,
    p_invested_amount: Number.isFinite(invested) ? invested : 0,
    p_portfolio_size: Number.isFinite(portfolio) ? portfolio : 0,
    p_invested_currency: currency,
    p_intent: fields.intent,
    p_avg_down: fields.avgDown,
    p_risk: fields.risk,
    p_cagr: fields.cagr,
    p_tax_residency: fields.taxResidency,
    p_tax_slab: taxSlab,
    p_model_id: fields.modelId,
    p_clarifications: clarifications,
    p_exchange: exchange,
    p_intended_investment: Number.isFinite(intended) && intended > 0 ? intended : 0,
    p_run_qty: Number.isFinite(runQty) && runQty > 0 ? runQty : 0,
    p_run_cost_per_share: Number.isFinite(runCost) && runCost > 0 ? runCost : 0,
  });

  if (error) {
    return acceptFail(parseAcceptError(error.message ?? ""));
  }
  const id = String(data ?? "");
  if (!id) {
    return acceptFail("Could not queue the analysis.");
  }
  return { error: null, requestId: id };
}

export async function cancelInFlightAnalysis(
  _prev: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const session = await getDeskSession();
  if (!session) {
    return { error: "Sign in again at /login.", done: false };
  }
  if (!canWriteFamily(session)) {
    return { error: parseAcceptError("THS-AUTH-001"), done: false };
  }
  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) {
    return { error: "That analysis was not found.", done: false };
  }
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("analysis_requests")
      .update({
        status: "failed",
        error_text: "Cancelled by user",
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("family_id", session.familyId)
      .in("status", [
        "queued",
        "gathering",
        "drafting",
        "checking",
        "rendering",
      ])
      .select("id");
    if (error || !data?.length) {
      return { error: "Could not stop that analysis.", done: false };
    }
  } catch {
    return { error: "Could not stop that analysis.", done: false };
  }
  return { error: null, done: true };
}
