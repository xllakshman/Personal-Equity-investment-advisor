export const PLAN_LIMIT_OPTIONS = [
  0, 3, 5, 6, 10, 15, 20, 25, 30, 40, 50, 80, 100, 150, 200,
] as const;

export const PLAN_PRICE_USD_OPTIONS = [
  0, 9, 19, 29, 39, 49, 79, 99, 149, 199, 249, 299,
] as const;

export const WEEKLY_TICKER_OPTIONS = [0, 3, 5, 10, 15, 20] as const;

export const NOTICE_PCTS = [60, 80, 90, 100] as const;

export type PlanEditState = { error: string | null; notice: string | null };
export const EMPTY_PLAN_EDIT: PlanEditState = { error: null, notice: null };

export type PlanEditInput = {
  planId: string;
  monthlyAnalysisLimit: number;
  priceCents: number;
  weeklyDigestTickerLimit: number;
  isActive: boolean;
  allowedModelIds: string[];
  whoCopy: string;
  whyCopy: string;
  notices: { pct: number; message: string }[];
};

export type PlanEditResult =
  | { ok: true; value: PlanEditInput }
  | { ok: false; error: string };

function withCurrent(options: readonly number[], current: number): number[] {
  const nums = [...options];
  if (Number.isFinite(current) && !nums.includes(current)) {
    nums.push(current);
    nums.sort((a, b) => a - b);
  }
  return nums;
}

export function limitChoices(current: number): number[] {
  return withCurrent(PLAN_LIMIT_OPTIONS, current);
}

export function priceUsdChoices(currentCents: number): number[] {
  const usd = Math.round(currentCents / 100);
  return withCurrent(PLAN_PRICE_USD_OPTIONS, usd);
}

export function weeklyTickerChoices(current: number): number[] {
  return withCurrent(WEEKLY_TICKER_OPTIONS, current);
}

export function parsePlanEdit(form: FormData, catalogIds: readonly string[]): PlanEditResult {
  const planId = String(form.get("planId") ?? "").trim();
  if (!planId) return { ok: false, error: "Missing plan." };

  const monthlyAnalysisLimit = Number(form.get("monthly_analysis_limit"));
  if (!Number.isInteger(monthlyAnalysisLimit) || monthlyAnalysisLimit < 0) {
    return { ok: false, error: "Notes per month must be a whole number of 0 or more." };
  }

  const priceUsd = Number(form.get("price_usd"));
  if (!Number.isInteger(priceUsd) || priceUsd < 0) {
    return { ok: false, error: "Price must be a whole USD amount." };
  }

  const weeklyDigestTickerLimit = Number(form.get("weekly_digest_ticker_limit"));
  if (!Number.isInteger(weeklyDigestTickerLimit) || weeklyDigestTickerLimit < 0) {
    return { ok: false, error: "Weekly email ticker cap must be a whole number of 0 or more." };
  }

  const listed = String(form.get("is_active") ?? "");
  if (listed !== "true" && listed !== "false") {
    return { ok: false, error: "Choose whether this plan is listed on Subscription." };
  }

  const allowedModelIds = form
    .getAll("model_id")
    .map((v) => String(v))
    .filter((id) => catalogIds.includes(id));
  if (allowedModelIds.length === 0) {
    return { ok: false, error: "Pick at least one agent this plan may run." };
  }

  const whoCopy = String(form.get("who_copy") ?? "").trim();
  const whyCopy = String(form.get("why_copy") ?? "").trim();
  if (!whoCopy || !whyCopy) {
    return { ok: false, error: "Who it is for and why the price both need copy." };
  }

  const notices = NOTICE_PCTS.map((pct) => ({
    pct,
    message: String(form.get(`notice_${pct}`) ?? "").trim(),
  }));
  if (notices.some((n) => !n.message)) {
    return { ok: false, error: "Each usage notice (60 / 80 / 90 / 100) needs a message." };
  }

  return {
    ok: true,
    value: {
      planId,
      monthlyAnalysisLimit,
      priceCents: priceUsd * 100,
      weeklyDigestTickerLimit,
      isActive: listed === "true",
      allowedModelIds,
      whoCopy,
      whyCopy,
      notices,
    },
  };
}
