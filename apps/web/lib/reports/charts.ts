/** Allowlisted `reports.charts` only. Unknown types and raw HTML are dropped. */

export const ALLOWED_CHART_TYPES = ["line", "bar", "table", "waterfall"] as const;

export type AllowedChartType = (typeof ALLOWED_CHART_TYPES)[number];

export type AllowedChart = {
  type: AllowedChartType;
  title: string;
  labels: string[];
  values: number[];
  rows: string[][];
  reference?: number;
  unit?: string;
  source?: string;
  as_of?: string;
};

const PROMPTISH = /prompt_versions|you are an? |system prompt|advisor prompt/i;
const SOURCE_LIMIT = 80;
const AS_OF_LIMIT = 32;

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

function captionField(raw: unknown, limit: number): string {
  if (raw == null) return "";
  const original = String(raw);
  if (looksLikeMarkup(original)) return "";
  const text = original.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text || PROMPTISH.test(text)) return "";
  return text.slice(0, limit);
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
  const parsed: AllowedChart = {
    type: typeRaw,
    title,
    labels: asStringList(rec.labels),
    values: asNumberList(rec.values ?? rec.data),
    rows: asRows(rec.rows),
  };
  const ref = Number(rec.reference);
  if (Number.isFinite(ref) && typeof rec.reference !== "boolean") {
    parsed.reference = ref;
  }
  const unit = rec.unit != null ? String(rec.unit) : "";
  if (unit && !looksLikeMarkup(unit) && unit.length <= 8) {
    parsed.unit = unit;
  }
  const source = captionField(rec.source ?? rec.data_source, SOURCE_LIMIT);
  if (source) parsed.source = source;
  const asOf = captionField(rec.as_of ?? rec.asOf, AS_OF_LIMIT);
  if (asOf) parsed.as_of = asOf;
  return parsed;
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

export function chartCaptionMeta(chart: AllowedChart): string {
  const bits: string[] = [];
  if (chart.source) bits.push(chart.source);
  if (chart.as_of) bits.push(`as of ${chart.as_of}`);
  return bits.join(" · ");
}

export function chartViewRows(chart: AllowedChart): string[][] {
  if (chart.type === "table" && chart.rows.length > 0) return chart.rows;
  const header = ["Period", "Value"];
  const rows = chart.labels.map((label, i) => {
    const value = chart.values[i];
    return [label, value == null ? "" : String(value)];
  });
  if (chart.reference != null && Number.isFinite(chart.reference)) {
    rows.push(["Reference", String(chart.reference)]);
  }
  return [header, ...rows];
}
