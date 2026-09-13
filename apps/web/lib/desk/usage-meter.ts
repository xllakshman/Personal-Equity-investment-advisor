export const USAGE_METER_KINDS = ["search", "refine", "refine_gate"] as const;

export type UsageMeterKind = (typeof USAGE_METER_KINDS)[number];

export function isUsageMeterKind(kind: string): boolean {
  return (USAGE_METER_KINDS as readonly string[]).includes(kind);
}

/** Same filter as thesis_family_meter_count (search + refine + refine_gate). */
export function meterEventCount(kinds: readonly string[]): number {
  return kinds.filter(isUsageMeterKind).length;
}

export function quotaExhausted(used: number, limit: number | null): boolean {
  if (limit == null || limit < 0) return false;
  return used >= limit;
}

/** Caption under Desk “Analyses this cycle”. Same kinds as thesis_family_meter_count. */
export function analysesThisCycleCaption(planName: string | null): string {
  const kinds = "usage_events kinds search, refine, refine_gate this month";
  return planName ? `${kinds} · ${planName}` : kinds;
}
