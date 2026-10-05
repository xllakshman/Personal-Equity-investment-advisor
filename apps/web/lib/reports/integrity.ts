/** Integrity warnings stored on new reports.sections only. Never invent for old notes. */

import { stripTags } from "./sections";

const PROMPTISH = /prompt_versions|you are an? |system prompt|advisor prompt/i;

export function parseIntegrityWarnings(sections: Record<string, unknown> | null | undefined): string[] {
  if (!sections || typeof sections !== "object") return [];
  const raw = sections.integrity_warnings;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: string[] = [];
  for (const row of raw) {
    let text = "";
    if (typeof row === "string") text = row;
    else if (row && typeof row === "object" && "message" in row) {
      text = String((row as { message?: unknown }).message ?? "");
    }
    const clean = stripTags(text).replace(/\s+/g, " ").trim();
    if (!clean || PROMPTISH.test(clean)) continue;
    out.push(clean.slice(0, 180));
  }
  return out;
}

export function filerTypeFromSections(sections: Record<string, unknown> | null | undefined): string {
  if (!sections || typeof sections !== "object") return "";
  const raw = sections.filer_type;
  if (typeof raw !== "string") return "";
  const clean = stripTags(raw).replace(/\s+/g, " ").trim();
  if (!clean || PROMPTISH.test(clean)) return "";
  return clean.slice(0, 80);
}

export function coverageFromSections(sections: Record<string, unknown> | null | undefined): string {
  if (!sections || typeof sections !== "object") return "";
  const raw = sections.coverage;
  if (typeof raw !== "string") return "";
  const clean = stripTags(raw).replace(/\s+/g, " ").trim();
  if (!clean || PROMPTISH.test(clean)) return "";
  return clean.slice(0, 120);
}
