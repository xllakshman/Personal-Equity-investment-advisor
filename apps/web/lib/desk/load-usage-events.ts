import type { MeterEvent } from "@/lib/desk/usage-meter";

export type UsageEventSelectError = {
  code?: string;
  message?: string;
} | null;

export type UsageEventMeterRow = {
  kind: string;
  quantity?: number | string | null;
  cost_cents?: number | string | null;
};

type UsageSelectResult = {
  data: unknown;
  error: UsageEventSelectError;
};

type UsageSelectFn = (columns: string) => PromiseLike<UsageSelectResult>;

function asUsageRows(data: unknown): UsageEventMeterRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const rec = row as Record<string, unknown>;
    return {
      kind: String(rec.kind ?? ""),
      quantity: rec.quantity as number | string | null | undefined,
      cost_cents: rec.cost_cents as number | string | null | undefined,
    };
  });
}

/** PostgREST error when usage_events.quantity is missing (PROD pre-027). */
export function missingQuantityColumn(error: UsageEventSelectError): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  const msg = String(error.message ?? "").toLowerCase();
  if (
    (code === "42703" || code === "PGRST204") &&
    (msg.includes("quantity") || msg.length === 0)
  ) {
    return true;
  }
  return (
    msg.includes("quantity") &&
    (msg.includes("does not exist") ||
      msg.includes("could not find") ||
      msg.includes("schema cache") ||
      msg.includes("column"))
  );
}

/**
 * SELECT usage_events for the meter. Tries quantity (027); if the column is
 * missing, retries without it. Missing/null quantity counts as 1 in meterCreditSum.
 * Never INSERT/UPDATE usage_events.
 */
export async function selectUsageEventsForMeter(
  runSelect: UsageSelectFn,
): Promise<UsageEventMeterRow[]> {
  const withQuantity = await runSelect("kind, quantity, cost_cents");
  if (!withQuantity.error || !missingQuantityColumn(withQuantity.error)) {
    return asUsageRows(withQuantity.data);
  }
  const withoutQuantity = await runSelect("kind, cost_cents");
  return asUsageRows(withoutQuantity.data).map((row) => ({
    ...row,
    quantity: 1,
  }));
}

export function meterEventsFromUsageRows(
  rows: readonly UsageEventMeterRow[],
): MeterEvent[] {
  return rows.map((row) => ({
    kind: String(row.kind ?? ""),
    quantity: row.quantity,
  }));
}

export function usageCostCents(rows: readonly UsageEventMeterRow[]): number {
  return rows.reduce((sum, row) => sum + Number(row.cost_cents ?? 0), 0);
}
