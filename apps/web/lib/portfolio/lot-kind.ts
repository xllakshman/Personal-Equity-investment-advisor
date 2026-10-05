export const LOT_KINDS = ["retail", "esop"] as const;
export type LotKind = (typeof LOT_KINDS)[number];

export const LOT_KIND_LABEL: Record<LotKind, string> = {
  retail: "Retail",
  esop: "ESOP",
};

/** Missing, blank, or unknown → retail. Use parseLotKindField to reject junk. */
export function asLotKind(raw: unknown): LotKind {
  return String(raw ?? "").trim().toLowerCase() === "esop" ? "esop" : "retail";
}

export function parseLotKindField(
  raw: unknown,
): { ok: true; value: LotKind } | { ok: false; error: string } {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return { ok: true, value: "retail" };
  if (s === "retail" || s === "esop") return { ok: true, value: s };
  return { ok: false, error: "Lot type must be Retail or ESOP." };
}

export function splitByLotKind<T extends { lot_kind: LotKind }>(
  rows: readonly T[],
): { retail: T[]; esop: T[] } {
  const retail: T[] = [];
  const esop: T[] = [];
  for (const row of rows) {
    if (row.lot_kind === "esop") esop.push(row);
    else retail.push(row);
  }
  return { retail, esop };
}

/** PostgREST / Postgres when holding_lots.lot_kind or holdings.lot_kind is missing (pre-028). */
export function missingLotKindColumn(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  const msg = String(error.message ?? "").toLowerCase();
  if (
    (code === "42703" || code === "PGRST204") &&
    (msg.includes("lot_kind") || msg.length === 0)
  ) {
    return true;
  }
  return (
    msg.includes("lot_kind") &&
    (msg.includes("does not exist") ||
      msg.includes("could not find") ||
      msg.includes("schema cache") ||
      msg.includes("column"))
  );
}

export function omitLotKind<T extends Record<string, unknown>>(
  row: T,
): Omit<T, "lot_kind"> {
  const { lot_kind: _ignored, ...rest } = row;
  return rest;
}

export type DbWriteError = { code?: string; message?: string } | null;

/**
 * Try the write with lot_kind; if PostgREST says the column is missing, retry
 * without it. Never invent the column on the server.
 */
export async function writeWithOptionalLotKind<T extends Record<string, unknown>>(
  rows: T[],
  run: (
    payload: T[] | Omit<T, "lot_kind">[],
  ) => PromiseLike<{ error: DbWriteError }>,
): Promise<{ error: DbWriteError; skippedKind: boolean }> {
  if (rows.length === 0) return { error: null, skippedKind: false };
  const first = await run(rows);
  if (!first.error) return { error: null, skippedKind: false };
  if (!missingLotKindColumn(first.error)) {
    return { error: first.error, skippedKind: false };
  }
  const stripped = rows.map((row) => omitLotKind(row));
  const second = await run(stripped);
  return { error: second.error, skippedKind: true };
}
