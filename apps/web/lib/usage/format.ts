import { formatCreditAmount } from "@/lib/desk/usage-meter";

import type { UsageSnapshot } from "./types";

export function usageCaption(snap: UsageSnapshot): string {
  if (snap.limit == null) return `${formatCreditAmount(snap.used)} analyses this month`;
  return `${formatCreditAmount(snap.used)} of ${snap.limit}`;
}

export function usageHumanHint(snap: UsageSnapshot): string {
  const plan = snap.planName ?? "Trial";
  const wallet = `$${(snap.walletCents / 100).toFixed(2)}`;
  return `${plan} plan · wallet ${wallet}`;
}

export function headerPlanLine(snap: UsageSnapshot): string {
  const slug = (snap.planSlug ?? "").toLowerCase();
  if (snap.exhausted) {
    return `${snap.planName ?? "Trial"} · Allowance used`;
  }
  if (slug === "trial" || (snap.planName ?? "Trial") === "Trial") return "Free trial";
  return snap.planName ?? "Trial";
}

export function analyseUsageChip(snap: UsageSnapshot): string {
  const plan = snap.planName ?? "Trial";
  if (snap.limit == null) return `${plan} · analyses this month`;
  return `${plan} · ${formatCreditAmount(snap.used)} of ${snap.limit} analyses used`;
}

export function planStatusLabel(
  billingStatus: string | null | undefined,
  exhausted: boolean,
): string {
  if (exhausted) return "Allowance used";
  const s = (billingStatus ?? "trial").toLowerCase();
  if (s === "subscribed") return "Active";
  if (s === "trial") return "Trial";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  if (s === "past_due") return "Past due";
  return "Active";
}

export function planChipLabel(snap: UsageSnapshot): string {
  const plan = snap.planName ?? "Trial";
  if (snap.exhausted) return `${plan} · Allowance used`;
  return plan;
}

/** Width for the sidebar meter fill. Unlimited plans match App.dc.html’s 8%. */
export function usageBarPct(used: number, limit: number | null): number {
  if (limit == null || limit <= 0) return 8;
  return Math.min(100, Math.round((used / limit) * 100));
}
