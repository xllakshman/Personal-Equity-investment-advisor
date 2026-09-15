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
    notice: "Top-up is not connected yet. Your wallet was not charged.",
  };
}

export async function requestCheckout(
  _prev: BillingActionState,
  _formData: FormData,
): Promise<BillingActionState> {
  await requireDeskSession();
  return {
    error: null,
    notice: "Payment is not connected yet. Your plan was not changed.",
  };
}
