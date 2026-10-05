export const USAGE_METER_KINDS = ["search", "refine", "refine_gate"] as const;

export type UsageMeterKind = (typeof USAGE_METER_KINDS)[number];

export type MeterEvent = {
  kind: string;
  quantity?: number | string | null;
};

export function isUsageMeterKind(kind: string): boolean {
  return (USAGE_METER_KINDS as readonly string[]).includes(kind);
}

/** Same kinds and quantity sum as thesis_family_meter_count. */
export function meterCreditSum(events: readonly MeterEvent[]): number {
  let sum = 0;
  for (const event of events) {
    if (!isUsageMeterKind(event.kind)) continue;
    const raw = Number(event.quantity);
    const qty = Number.isFinite(raw) && raw > 0 ? raw : 1;
    sum += qty;
  }
  return Math.round(sum * 100) / 100;
}

/** Row count of meter kinds (each event = 1). Desk KPI uses meterCreditSum. */
export function meterEventCount(kinds: readonly string[]): number {
  return meterCreditSum(kinds.map((kind) => ({ kind, quantity: 1 })));
}

export function formatCreditAmount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

export function quotaExhausted(used: number, limit: number | null): boolean {
  if (limit == null || limit < 0) return false;
  return used >= limit;
}

/** Caption under Home “Notes this month”. */
export function analysesThisCycleCaption(planName: string | null): string {
  return planName ? `${planName} plan` : "Trial plan";
}

export function notesThisMonthHint(
  used: number,
  limit: number | null,
  planName: string | null,
): string {
  const plan = planName ?? "Trial";
  if (limit == null) return `${plan} · analyses this month`;
  return `${plan} · ${formatCreditAmount(used)} of ${limit} analyses this month`;
}
