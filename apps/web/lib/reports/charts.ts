/** Allowlisted `reports.charts` only. Unknown types and raw HTML are dropped. */

export const ALLOWED_CHART_TYPES = ["line", "bar", "table", "waterfall"] as const;

export type AllowedChartType = (typeof ALLOWED_CHART_TYPES)[number];

export type AllowedChart = {
  type: AllowedChartType;
  title: string;
  labels: string[];
  values: number[];
  rows: string[][];
};

function isAllowedType(value: string): value is AllowedChartType {
  return (ALLOWED_CHART_TYPES as readonly string[]).includes(value);
}

function looksLikeMarkup(value: string): boolean {
  return /<\s*(script|iframe|object|embed|html|svg|img)\b/i.test(value);
}

function asStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item)).filter((item) => !looksLikeMarkup(item));
}

function asNumberList(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => Number(item)).filter((n) => Number.isFinite(n));
}

function asRows(raw: unknown): string[][] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(Array.isArray)
    .map((row) => row.map((cell) => String(cell)).filter((cell) => !looksLikeMarkup(cell)));
}

function parseOne(raw: unknown, dropped: string[]): AllowedChart | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    dropped.push("not-object");
    return null;
  }
  const rec = raw as Record<string, unknown>;
  const typeRaw = String(rec.type ?? "");
  if (!isAllowedType(typeRaw)) {
    dropped.push(typeRaw || "missing-type");
    return null;
  }
  const title = rec.title != null ? String(rec.title) : "";
  if (looksLikeMarkup(title)) {
    dropped.push("markup-title");
    return null;
  }
  if (Array.isArray(rec.labels) && rec.labels.some((item) => looksLikeMarkup(String(item)))) {
    dropped.push("markup-label");
    return null;
  }
  return {
    type: typeRaw,
    title,
    labels: asStringList(rec.labels),
    values: asNumberList(rec.values ?? rec.data),
    rows: asRows(rec.rows),
  };
}

export function parseCharts(raw: unknown): { charts: AllowedChart[]; dropped: string[] } {
  const dropped: string[] = [];
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? Object.values(raw as Record<string, unknown>)
      : [];
  const charts: AllowedChart[] = [];
  for (const item of list) {
    const parsed = parseOne(item, dropped);
    if (parsed) charts.push(parsed);
  }
  return { charts, dropped };
}
