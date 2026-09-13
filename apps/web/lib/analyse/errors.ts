export const INTENTS = [
  { id: "long_term", label: "Long-term investment" },
  { id: "swing", label: "Swing trade" },
  { id: "positional_3_9m", label: "Positional — 3 to 9 months" },
  { id: "undecided", label: "Undecided — advise me" },
] as const;

export const AVG_DOWN = [
  { id: "planned_tranches", label: "Yes — in planned tranches" },
  { id: "thesis_intact_dips", label: "Yes — only on thesis-intact dips" },
  { id: "single_entry", label: "No — single entry only" },
] as const;

export const US_SLABS = ["10%", "12%", "22%", "24%", "32%", "35%", "37%"];
export const IN_SLABS = ["5%", "10%", "15%", "20%", "30%"];

export function parseAcceptError(message: string): string {
  const m = message.toUpperCase();
  if (m.includes("THS-RISK-001")) {
    return "Incompatible pair. The server refused this risk/CAGR combination. No row was queued.";
  }
  if (m.includes("THS-QUOTA-001")) {
    return "Allowance exhausted for this cycle. No analysis_requests row was inserted.";
  }
  if (m.includes("THS-HOLDING-001")) {
    return "That ticker is not on holdings for this family. No search was counted.";
  }
  if (m.includes("THS-LENS-001")) {
    return "Pick at least one check.";
  }
  return "Could not queue the analysis.";
}
