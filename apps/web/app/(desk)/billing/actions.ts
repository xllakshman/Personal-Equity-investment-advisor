"use server";

import { requireDeskSession } from "@/lib/desk/session";

export type BillingActionState = { error: string | null; notice: string | null };
export const EMPTY_BILLING_STATE: BillingActionState = { error: null, notice: null };

export async function requestTopup(
  _prev: BillingActionState,
  _formData: FormData,
): Promise<BillingActionState> {
  await requireDeskSession();
  return {
    error: null,
    notice: "UPI not connected. wallets.balance_cents was not changed.",
  };
}

export async function requestCheckout(
  _prev: BillingActionState,
  _formData: FormData,
): Promise<BillingActionState> {
  await requireDeskSession();
  return {
    error: null,
    notice: "Checkout is a placeholder. invoices and families.plan_id were not changed.",
  };
}
