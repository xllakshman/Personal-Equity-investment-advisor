import type { UsageSnapshot } from "./types";

export function usageCaption(snap: UsageSnapshot): string {
  if (snap.limit == null) return `${snap.used} searches this cycle`;
  return `${snap.used} / ${snap.limit}`;
}
