import { normalizeTicker } from "@/lib/desk/ticker";

export const LENSES = new Set(["fundamental", "technical", "macro", "news", "tax"]);
export const INTENTS = new Set(["long_term", "swing", "positional_3_9m", "undecided"]);
export const AVG = new Set(["planned_tranches", "thesis_intact_dips", "single_entry"]);
export const RISKS = new Set(["low_0_10", "medium_11_20", "high_21_35", "extreme_35_plus"]);
export const CAGRS = new Set(["low_12", "medium_13_18", "high_18_25", "extreme_25_plus"]);
export const RES = new Set(["us", "india", "uae", "nri"]);

export type AcceptFields = {
  ticker: string;
  lenses: string[];
  intent: string;
  avgDown: string;
  risk: string;
  cagr: string;
  taxResidency: string;
  modelId: string;
  skipClarify: boolean;
  conviction: string;
  addFunds: string;
  exitRule: string;
};

export function parseAcceptFields(form: {
  get: (name: string) => FormDataEntryValue | null;
  getAll: (name: string) => FormDataEntryValue[];
}): AcceptFields {
  return {
    ticker: normalizeTicker(String(form.get("ticker") ?? "")),
    lenses: form
      .getAll("lenses")
      .map((v) => String(v))
      .filter((v) => LENSES.has(v)),
    intent: String(form.get("intent") ?? ""),
    avgDown: String(form.get("avg_down") ?? ""),
    risk: String(form.get("risk") ?? ""),
    cagr: String(form.get("cagr") ?? ""),
    taxResidency: String(form.get("tax_residency") ?? "us"),
    modelId: String(form.get("model_id") ?? ""),
    skipClarify: String(form.get("skip_clarify") ?? "") === "1",
    conviction: String(form.get("conviction") ?? "").trim(),
    addFunds: String(form.get("addFunds") ?? "").trim(),
    exitRule: String(form.get("exitRule") ?? "").trim(),
  };
}

/** Client-side enum/empty guards. RPC still enforces THS-* on insert. */
export function validateAcceptFields(fields: AcceptFields): string | null {
  if (!fields.ticker) {
    return "That stock is not in your portfolio yet. Add it on Portfolio first.";
  }
  if (
    !INTENTS.has(fields.intent) ||
    !AVG.has(fields.avgDown) ||
    !RISKS.has(fields.risk) ||
    !CAGRS.has(fields.cagr)
  ) {
    return "Invalid builder fields.";
  }
  if (!RES.has(fields.taxResidency) || !fields.modelId) {
    return "Pick a model and tax residency.";
  }
  if (fields.lenses.length === 0) {
    return "Pick at least one check.";
  }
  return null;
}

export function clarificationsPayload(
  skip: boolean,
  conviction: string,
  addFunds: string,
  exitRule: string,
): Record<string, string> {
  if (skip) return {};
  return { conviction, addFunds, exitRule };
}
