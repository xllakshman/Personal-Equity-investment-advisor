/** Render `reports.sections` as text. Never execute HTML from the model. */

export const BEGINNER_KEYS = [
  "verdict",
  "step0",
  "evidence",
  "moat",
  "execution",
  "sizing",
  "scenarios",
  "tax",
  "news",
] as const;

export const EXPERT_EXTRA_KEYS = [
  "pre_buy",
  "profit_booking",
  "construction",
  "dual_sleeve",
  "tranches",
] as const;

export const TAB_KEYS = [
  "verdict",
  "evidence",
  "moat",
  "execution",
  "scenarios",
  "tax",
  "news",
  "refine",
] as const;

export type ReportTab = (typeof TAB_KEYS)[number];

const PROSE_KEYS = ["prose", "text", "body", "summary", "narrative", "note", "thesis"];
const SKIP_META_KEYS = new Set([
  "adherence",
  "status",
  "data_source",
  "quote_date",
  "currency",
  "filer_type",
  "coverage",
  "integrity_warnings",
  "field_status",
  "step0_coverage",
]);

export function isProgressKey(key: string): boolean {
  const k = key.toLowerCase();
  return k === "stage_status" || k.startsWith("retrieval_") || k.startsWith("stage_");
}

export function isFinishedNote(sections: Record<string, unknown> | null | undefined): boolean {
  if (!sections || typeof sections !== "object") return false;
  const doc = noteDocument(sections);
  if (doc.length >= 200) return true;
  const keys = Object.keys(sections);
  if (keys.length === 0) return false;
  if (keys.some(isProgressKey)) return false;
  return "verdict" in sections || "moat" in sections;
}

export function noteDocument(sections: Record<string, unknown>): string {
  const prose = sections.plain_language;
  if (typeof prose === "string" && prose.trim().length >= 80) {
    return stripTags(prose.trim());
  }
  const parts: string[] = [];
  for (const key of ["verdict", "step0", "moat", "pre_buy", "sizing", "profit_booking", "construction"]) {
    const text = sectionText(sections[key]);
    if (text) parts.push(text);
  }
  return parts.join("\n\n");
}

function label(key: string): string {
  return key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function sectionText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return stripTags(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => sectionText(item)).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const parts: string[] = [];
    const call = rec.call;
    if (typeof call === "string" && call.trim()) {
      parts.push(stripTags(call.trim()));
    }
    for (const key of PROSE_KEYS) {
      const raw = rec[key];
      if (typeof raw === "string" && raw.trim()) {
        parts.push(stripTags(raw.trim()));
      }
    }
    for (const [key, child] of Object.entries(rec)) {
      if (isProgressKey(key) || SKIP_META_KEYS.has(key)) continue;
      if (key === "call" || PROSE_KEYS.includes(key)) continue;
      const text = sectionText(child);
      if (!text) continue;
      parts.push(`${label(key)}\n${text}`);
    }
    return parts.join("\n\n");
  }
  return "";
}

export function stripTags(raw: string): string {
  return raw.replace(/<[^>]*>/g, "");
}

export function pickSection(
  sections: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (key in sections) return sections[key];
  }
  return null;
}

export function visibleSectionKeys(
  sections: Record<string, unknown>,
  expert: boolean,
): string[] {
  const keys = Object.keys(sections).filter((k) => !isProgressKey(k));
  if (expert) return keys;
  const beginner = new Set<string>(BEGINNER_KEYS);
  return keys.filter((k) => beginner.has(k));
}

export function moneyCents(cents: number): string {
  if (!Number.isFinite(cents)) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}
