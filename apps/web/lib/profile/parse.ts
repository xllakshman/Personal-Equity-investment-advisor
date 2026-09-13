import type { BlackoutWindow, OutsideBook } from "./defaults";

export function parseNumberField(
  raw: string,
  opts: { integer?: boolean; min?: number; fallback: number },
): number {
  const n = opts.integer ? Number.parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(n)) return opts.fallback;
  if (opts.min !== undefined && n < opts.min) return opts.fallback;
  return n;
}

export function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function blackoutsFromForm(formData: FormData): BlackoutWindow[] {
  const labels = formData.getAll("blackout_label").map((v) => String(v));
  const starts = formData.getAll("blackout_start").map((v) => String(v));
  const ends = formData.getAll("blackout_end").map((v) => String(v));
  const n = Math.max(labels.length, starts.length, ends.length);
  const rows: BlackoutWindow[] = [];
  for (let i = 0; i < n; i++) {
    const label = (labels[i] ?? "").trim();
    const start = (starts[i] ?? "").trim();
    const end = (ends[i] ?? "").trim();
    if (!label && !start && !end) continue;
    rows.push({ label, start, end });
  }
  return rows;
}

export function outsideBookFromForm(formData: FormData): OutsideBook {
  return {
    cash: parseOptionalNumber(String(formData.get("outside_cash") ?? "")),
    gold: parseOptionalNumber(String(formData.get("outside_gold") ?? "")),
    house: parseOptionalNumber(String(formData.get("outside_house") ?? "")),
    unlisted: parseOptionalNumber(String(formData.get("outside_unlisted") ?? "")),
  };
}
