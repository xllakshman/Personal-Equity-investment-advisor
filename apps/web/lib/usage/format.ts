import type { UsageSnapshot } from "./types";

export function usageCaption(snap: UsageSnapshot): string {
  if (snap.limit == null) return `${snap.used} notes this month`;
  return `${snap.used} of ${snap.limit}`;
}

export function usageHumanHint(snap: UsageSnapshot): string {
  const plan = snap.planName ?? "Free trial";
  if (snap.limit == null) return `${plan} · notes this month`;
  return `${plan} · ${snap.used} of ${snap.limit} notes this month`;
}
