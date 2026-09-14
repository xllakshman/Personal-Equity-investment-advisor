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

export function sectionText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return stripTags(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => sectionText(item)).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${sectionText(v)}`)
      .join("\n");
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
  const keys = Object.keys(sections);
  if (expert) return keys;
  const beginner = new Set<string>(BEGINNER_KEYS);
  return keys.filter((k) => beginner.has(k));
}

export function moneyCents(cents: number): string {
  if (!Number.isFinite(cents)) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}
