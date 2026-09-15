export const PLAN_CARD_TITLE: Record<string, string> = {
  trial: "Trial",
  basic: "Basic",
  professional: "Professional",
  premium: "Professional +",
  ultra: "Ultra",
};

export function planCardTitle(slug: string, fallback: string): string {
  return PLAN_CARD_TITLE[slug] ?? fallback;
}

/** Plan allowance line. Trial is sample notes, not a monthly count. */
export function planLimitLabel(slug: string, limit: number): string {
  if (slug === "trial") return "Review existing sample reports";
  return `${limit} analyses per month`;
}
