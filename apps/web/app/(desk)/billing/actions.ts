"use server";

import { revalidatePath } from "next/cache";

import { planCardTitle } from "@/lib/billing/plan-titles";
import { sendSubscribeRequestEmail } from "@/lib/billing/send-subscribe";
import { type BillingActionState } from "@/lib/billing/action-state";
import { parseSubscribePlanId, subscribeNotice } from "@/lib/billing/subscribe-request";
import { UPI_VPA } from "@/lib/billing/upi";
import { canWriteFamily, getDeskSession } from "@/lib/desk/session";
import { createClient } from "@/lib/supabase/server";

export async function requestTopup(
  _prev: BillingActionState,
  _formData: FormData,
): Promise<BillingActionState> {
  const session = await getDeskSession();
  if (!session) {
    return { error: "Sign in again at /login.", notice: null };
  }
  return {
    error: null,
    notice: "Top-up is not connected yet. Your wallet was not charged.",
  };
}

export async function requestCheckout(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const session = await getDeskSession();
  if (!session) {
    return { error: "Sign in again at /login.", notice: null };
  }
  if (!canWriteFamily(session)) {
    return { error: "Viewers cannot request a plan.", notice: null };
  }
  const parsed = parseSubscribePlanId(String(formData.get("planId") ?? ""));
  if (!parsed.ok) return { error: parsed.error, notice: null };

  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, slug, name, price_cents, is_active")
    .eq("id", parsed.value.planId)
    .maybeSingle();
  if (planError) return { error: "Could not read that plan.", notice: null };
  if (!plan?.id || plan.is_active === false) {
    return { error: "That plan is not available.", notice: null };
  }

  await supabase
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("family_id", session.familyId)
    .eq("status", "pending");

  const { error: insertError } = await supabase.from("invoices").insert({
    family_id: session.familyId,
    plan_id: plan.id,
    amount_cents: Number(plan.price_cents ?? 0),
    currency: "USD",
    provider: "upi",
    provider_ref: `subscribe:${session.familyId}:${plan.id}:${Date.now()}`,
    status: "pending",
  });
  if (insertError) {
    return {
      error: "Could not save that request. Your plan was not changed.",
      notice: null,
    };
  }

  const title = planCardTitle(String(plan.slug), String(plan.name));
  const mailed = await sendSubscribeRequestEmail({
    fullName: session.fullName,
    email: session.email ?? "",
    familyId: session.familyId,
    planTitle: title,
    planSlug: String(plan.slug),
    priceCents: Number(plan.price_cents ?? 0),
    vpa: UPI_VPA,
  });

  revalidatePath("/billing");
  revalidatePath("/admin/accounts");
  return {
    error: null,
    notice: subscribeNotice({
      planTitle: title,
      priceCents: Number(plan.price_cents ?? 0),
      vpa: UPI_VPA,
      mailed: mailed.ok,
    }),
  };
}
