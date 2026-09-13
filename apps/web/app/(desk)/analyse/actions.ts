"use server";

import { redirect } from "next/navigation";

import {
  clarificationsPayload,
  parseAcceptFields,
  validateAcceptFields,
} from "@/lib/analyse/accept-fields";
import { parseAcceptError } from "@/lib/analyse/errors";
import { requireDeskSession } from "@/lib/desk/session";
import { createClient } from "@/lib/supabase/server";

export type AcceptState = { error: string | null };
export const EMPTY_ACCEPT: AcceptState = { error: null };

export async function acceptAnalysis(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  await requireDeskSession();
  const fields = parseAcceptFields(formData);
  const fieldError = validateAcceptFields(fields);
  if (fieldError) {
    return { error: fieldError };
  }
  const taxSlab = String(formData.get("tax_slab") ?? "").trim() || null;
  const exchange = String(formData.get("exchange") ?? "").trim() || null;
  const currency = String(formData.get("invested_currency") ?? "USD").slice(0, 3) || "USD";
  const invested = Number(formData.get("invested_amount") ?? 0);
  const portfolio = Number(formData.get("portfolio_size") ?? 0);
  const clarifications = clarificationsPayload(
    fields.skipClarify,
    fields.conviction,
    fields.addFunds,
    fields.exitRule,
  );

  const supabase = await createClient();
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
  });

  if (error) {
    return { error: parseAcceptError(error.message ?? "") };
  }
  const id = String(data ?? "");
  if (!id) {
    return { error: "Could not queue the analysis." };
  }
  redirect(`/analyse/${id}`);
}
