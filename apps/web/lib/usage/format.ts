import type { UsageSnapshot } from "./types";

export function usageCaption(snap: UsageSnapshot): string {
  if (snap.limit == null) return `${snap.used} analyses this month`;
  return `${snap.used} of ${snap.limit}`;
}

export function usageHumanHint(snap: UsageSnapshot): string {
  const plan = snap.planName ?? "Free trial";
  if (snap.limit == null) return `${plan} · analyses this month`;
  return `${plan} · ${snap.used} of ${snap.limit} analyses this month`;
}
