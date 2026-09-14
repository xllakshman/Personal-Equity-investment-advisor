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
