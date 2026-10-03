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
  preferred = "opus5",
): string | null {
  if (modelAllowed(preferred, allowedIds) && models.some((m) => m.id === preferred)) {
    return preferred;
  }
  const first = models.find((m) => modelAllowed(m.id, allowedIds));
  return first?.id ?? null;
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

const PLAN_NEED: Record<string, string> = {
  trial: "Trial",
  basic: "Basic",
  professional: "Professional",
  premium: "Professional +",
  ultra: "Ultra",
};

export function agentBand(thesisClass: CatalogModel["thesis_class"]): string {
  return thesisClass === "frontier" ? "Frontier agents" : "Quick agents";
}

export function agentEligibility(
  model: CatalogModel,
  allowedIds: readonly string[],
): { allowed: boolean; badge: string; band: string } {
  const allowed = modelAllowed(model.id, allowedIds);
  const band = agentBand(model.thesis_class);
  if (allowed) {
    return { allowed: true, badge: "On your plan", band };
  }
  const need =
    PLAN_NEED[model.min_plan_slug] ??
    (model.thesis_class === "frontier" ? "Professional" : "a higher plan");
  return { allowed: false, badge: `Needs ${need}`, band };
}
