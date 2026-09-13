export type CatalogModel = {
  id: string;
  label: string;
  provider: string;
  vendor_class: string;
  thesis_class: "frontier" | "quick";
  cost_cents_per_run: number;
};

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
  held: boolean;
  lensCount: number;
  conflict: boolean;
  modelId: string | null;
  modelOnPlan: boolean;
}): boolean {
  return (
    opts.held &&
    opts.lensCount > 0 &&
    !opts.conflict &&
    Boolean(opts.modelId) &&
    opts.modelOnPlan
  );
}
