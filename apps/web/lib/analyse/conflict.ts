export const RISK_BANDS = [
  { id: "low_0_10", label: "Low — 0–10% drawdown" },
  { id: "medium_11_20", label: "Medium — 11–20% drawdown" },
  { id: "high_21_35", label: "High — 21–35% drawdown" },
  { id: "extreme_35_plus", label: "Extremely high — >35% drawdown" },
] as const;

export const CAGR_BANDS = [
  { id: "low_12", label: "Low — up to 12%" },
  { id: "medium_13_18", label: "Medium — 13–18%" },
  { id: "high_18_25", label: "High — 18–25%" },
  { id: "extreme_25_plus", label: "Extremely high — >25%" },
] as const;

export type RiskBand = (typeof RISK_BANDS)[number]["id"];
export type CagrBand = (typeof CAGR_BANDS)[number]["id"];

export function isRiskCagrConflict(risk: string, cagr: string): boolean {
  return (
    (risk === "low_0_10" || risk === "medium_11_20") &&
    (cagr === "high_18_25" || cagr === "extreme_25_plus")
  );
}

export function hasRiskCagrSlack(risk: string, cagr: string): boolean {
  return (
    (risk === "high_21_35" || risk === "extreme_35_plus") && cagr === "low_12"
  );
}

export const CONFLICT_TITLE = "Incompatible pair";
export const CONFLICT_MSG =
  "Low or medium drawdown appetite cannot underwrite a high or extreme CAGR. Change one of the two.";
export const SLACK_TITLE = "Unused risk budget";
export const SLACK_MSG =
  "High or extreme risk with a low CAGR is allowed. The note will still run.";
