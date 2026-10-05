export type CatalogModel = {
  id: string;
  label: string;
  provider: string;
  vendor_class: string;
  thesis_class: "frontier" | "quick";
  cost_cents_per_run: number;
  min_plan_slug: string;
};

export const NATIVE_PROVIDERS = ["openai", "anthropic", "xai", "deepseek"] as const;

export function isNativeProvider(provider: string): boolean {
  return (NATIVE_PROVIDERS as readonly string[]).includes(provider);
}

export function nativeCatalogModels(models: CatalogModel[]): CatalogModel[] {
  return models.filter((m) => isNativeProvider(m.provider));
}

export function modelAllowed(id: string, allowedIds: readonly string[]): boolean {
  return allowedIds.includes(id);
}

/** Lower number = cheaper plan. trial < basic < professional < premium < ultra. */
export const PLAN_RANK: Record<string, number> = {
  trial: 0,
  basic: 1,
  professional: 2,
  premium: 3,
  ultra: 4,
};

export function planMeetsMin(planSlug: string, minSlug: string): boolean {
  return (PLAN_RANK[planSlug] ?? 0) >= (PLAN_RANK[minSlug] ?? 0);
}

/** On plan = ticked on that plan row AND the family's plan meets min_plan_slug. Trial/Basic never run Frontier. Ultra / Professional / Professional+ (premium) get every Quick and Frontier agent. */
export const FULL_AGENT_PLANS = ["professional", "premium", "ultra"] as const;

export function planHasAllAgents(planSlug: string): boolean {
  return (FULL_AGENT_PLANS as readonly string[]).includes(planSlug);
}

export function modelOnPlan(
  model: Pick<CatalogModel, "id" | "thesis_class" | "min_plan_slug">,
  allowedIds: readonly string[],
  planSlug: string,
): boolean {
  if (model.thesis_class !== "frontier" && model.thesis_class !== "quick") {
    return false;
  }
  if (
    (planSlug === "trial" || planSlug === "basic") &&
    model.thesis_class === "frontier"
  ) {
    return false;
  }
  if (!planMeetsMin(planSlug, model.min_plan_slug)) return false;
  if (planHasAllAgents(planSlug)) return true;
  return modelAllowed(model.id, allowedIds);
}

export function agentCreditCost(
  thesisClass: CatalogModel["thesis_class"],
): number {
  return thesisClass === "frontier" ? 1.5 : 1;
}

export function agentCreditLabel(
  thesisClass: CatalogModel["thesis_class"],
): string {
  return thesisClass === "frontier" ? "1.5 credits" : "1 credit";
}

export function groupModels(models: CatalogModel[]): {
  frontier: CatalogModel[];
  quick: CatalogModel[];
} {
  return {
    frontier: models.filter((m) => m.thesis_class === "frontier"),
    quick: models.filter((m) => m.thesis_class === "quick"),
  };
}

export function defaultModelId(
  models: CatalogModel[],
  allowedIds: readonly string[],
  planSlug = "trial",
  preferred = "opus5",
): string | null {
  const onPlan = (m: CatalogModel) => modelOnPlan(m, allowedIds, planSlug);
  const prefer = models.find((m) => m.id === preferred && onPlan(m));
  if (prefer) return prefer.id;
  return models.find(onPlan)?.id ?? null;
}

export function canContinue(opts: {
  hasTicker: boolean;
  lensCount: number;
  conflict: boolean;
  modelId: string | null;
  modelOnPlan: boolean;
}): boolean {
  return (
    opts.hasTicker &&
    opts.lensCount > 0 &&
    !opts.conflict &&
    Boolean(opts.modelId) &&
    opts.modelOnPlan
  );
}

export function agentBand(thesisClass: CatalogModel["thesis_class"]): string {
  return thesisClass === "frontier" ? "Frontier agents" : "Quick agents";
}

export function agentEligibility(
  model: CatalogModel,
  allowedIds: readonly string[],
  planSlug: string,
): { allowed: boolean; badge: string; band: string } {
  const allowed = modelOnPlan(model, allowedIds, planSlug);
  const band = agentBand(model.thesis_class);
  if (allowed) {
    return { allowed: true, badge: "On plan", band };
  }
  return { allowed: false, badge: "Change your plan", band };
}
