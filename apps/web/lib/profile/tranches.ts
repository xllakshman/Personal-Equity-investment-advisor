import { parseNumberField } from "./parse";

export type EntryTranches = {
  tranche_t1_pct: number;
  tranche_t2_pct: number;
  tranche_t3_pct: number;
  tranche_t4_pct: number;
};

export type TrancheParse =
  | { ok: true; value: EntryTranches }
  | { ok: false; error: string };

export function parseEntryTranches(form: FormData): TrancheParse {
  const keys = [
    "tranche_t1_pct",
    "tranche_t2_pct",
    "tranche_t3_pct",
    "tranche_t4_pct",
  ] as const;
  const value: EntryTranches = {
    tranche_t1_pct: 0,
    tranche_t2_pct: 0,
    tranche_t3_pct: 0,
    tranche_t4_pct: 0,
  };
  for (const key of keys) {
    const raw = String(form.get(key) ?? "").trim();
    if (!raw) {
      return { ok: false, error: "Enter all four tranche percentages." };
    }
    const n = parseNumberField(raw, { min: 0, fallback: Number.NaN });
    if (!Number.isFinite(n) || n > 100) {
      return { ok: false, error: "Each tranche must be between 0 and 100." };
    }
    value[key] = n;
  }
  return { ok: true, value };
}

export function trancheSummary(t: EntryTranches): string {
  return `T1 ${t.tranche_t1_pct}% · T2 ${t.tranche_t2_pct}% · T3 ${t.tranche_t3_pct}% · T4 ${t.tranche_t4_pct}%`;
}
