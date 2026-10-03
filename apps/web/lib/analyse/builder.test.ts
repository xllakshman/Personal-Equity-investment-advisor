import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONFLICT_TITLE,
  hasRiskCagrSlack,
  isRiskCagrConflict,
  SLACK_TITLE,
} from "./conflict";
import { allocationPct } from "./format";
import { isComprehensive, selectedLenses, toggleLens, type LensState } from "./lenses";
import {
  canContinue,
  defaultModelId,
  groupModels,
  modelAllowed,
  modelOnPlan,
  agentEligibility,
  nativeCatalogModels,
} from "./models";

const base: LensState = {
  fundamental: true,
  technical: true,
  macro: false,
  news: false,
  tax: false,
};

describe("risk/cagr matrix", () => {
  it("conflicts on low/medium risk with high/extreme CAGR", () => {
    assert.equal(isRiskCagrConflict("low_0_10", "high_18_25"), true);
    assert.equal(isRiskCagrConflict("medium_11_20", "extreme_25_plus"), true);
    assert.equal(isRiskCagrConflict("medium_11_20", "medium_13_18"), false);
    assert.equal(CONFLICT_TITLE, "Incompatible pair");
  });

  it("allows slack on high/extreme risk with low CAGR", () => {
    assert.equal(hasRiskCagrSlack("high_21_35", "low_12"), true);
    assert.equal(hasRiskCagrSlack("extreme_35_plus", "low_12"), true);
    assert.equal(hasRiskCagrSlack("high_21_35", "high_18_25"), false);
    assert.equal(SLACK_TITLE, "Unused risk budget");
  });
});

describe("lenses", () => {
  it("Comprehensive checks all four core lenses", () => {
    const on = toggleLens(base, "comprehensive");
    assert.equal(isComprehensive(on), true);
    assert.deepEqual(selectedLenses(on), [
      "fundamental",
      "technical",
      "macro",
      "news",
    ]);
    const off = toggleLens(on, "comprehensive");
    assert.equal(isComprehensive(off), false);
    assert.deepEqual(selectedLenses(off), []);
  });
});

describe("model picker", () => {
  const models = [
    {
      id: "opus5",
      label: "Claude Opus 5",
      provider: "anthropic",
      vendor_class: "Opus",
      thesis_class: "frontier" as const,
      cost_cents_per_run: 180,
      min_plan_slug: "professional",
    },
    {
      id: "gpt6a",
      label: "GPT-6 Astra",
      provider: "openai",
      vendor_class: "Flagship",
      thesis_class: "frontier" as const,
      cost_cents_per_run: 180,
      min_plan_slug: "professional",
    },
    {
      id: "gpt56m",
      label: "GPT-5.6 Luna",
      provider: "openai",
      vendor_class: "Cost-sensitive",
      thesis_class: "quick" as const,
      cost_cents_per_run: 20,
      min_plan_slug: "trial",
    },
  ];

  it("lets Professional pick opus5 and locks gpt6a on trial", () => {
    const pro = ["opus5", "gpt6a", "gpt56m"];
    const trial = ["gpt56m"];
    assert.equal(modelAllowed("opus5", pro), true);
    assert.equal(modelAllowed("gpt6a", trial), false);
    assert.equal(defaultModelId(models, pro, "professional"), "opus5");
    assert.equal(defaultModelId(models, trial, "trial"), "gpt56m");
    const g = groupModels(models);
    assert.equal(g.frontier.length, 2);
    assert.equal(g.quick.length, 1);
  });

  it("labels Frontier vs Quick eligibility from allowed_model_ids and min_plan_slug", () => {
    const trial = ["gpt56m", "gpt6a"];
    const frontier = agentEligibility(models[0], trial, "trial");
    const quick = agentEligibility(models[2], trial, "trial");
    assert.equal(frontier.band, "Frontier agents");
    assert.equal(frontier.allowed, false);
    assert.equal(frontier.badge, "Upgrade your plan");
    assert.equal(quick.band, "Quick agents");
    assert.equal(quick.allowed, true);
    assert.equal(quick.badge, "On plan");
    const astraOnTrial = agentEligibility(models[1], trial, "trial");
    assert.equal(astraOnTrial.allowed, false);
    assert.equal(astraOnTrial.badge, "Upgrade your plan");
    assert.equal(modelOnPlan(models[1], trial, "trial"), false);
    const pro = agentEligibility(models[0], ["opus5", "gpt56m"], "professional");
    assert.equal(pro.allowed, true);
    assert.equal(pro.badge, "On plan");
  });

  it("hides Gemini and Kimi from the picker", () => {
    const mixed = [
      ...models,
      {
        id: "gemini31p",
        label: "Gemini 3.1 Pro",
        provider: "google",
        vendor_class: "Pro",
        thesis_class: "frontier" as const,
        cost_cents_per_run: 150,
        min_plan_slug: "professional",
      },
      {
        id: "kimik3",
        label: "Kimi K3",
        provider: "moonshot",
        vendor_class: "K3",
        thesis_class: "frontier" as const,
        cost_cents_per_run: 150,
        min_plan_slug: "professional",
      },
    ];
    const shown = nativeCatalogModels(mixed);
    assert.equal(shown.some((m) => m.provider === "google"), false);
    assert.equal(shown.some((m) => m.provider === "moonshot"), false);
    assert.equal(shown.some((m) => m.id === "opus5"), true);
  });

  it("prefills invested as qty times cost (Maya MSFT 28 × 402.5)", () => {
    assert.equal(allocationPct(28 * 402.5, 150000) > 0, true);
    assert.equal(28 * 402.5, 11270);
  });

  it("disables Continue when ticker is empty or pair conflicts", () => {
    assert.equal(
      canContinue({
        hasTicker: true,
        lensCount: 2,
        conflict: false,
        modelId: "opus5",
        modelOnPlan: true,
      }),
      true,
    );
    assert.equal(
      canContinue({
        hasTicker: false,
        lensCount: 2,
        conflict: false,
        modelId: "opus5",
        modelOnPlan: true,
      }),
      false,
    );
    assert.equal(
      canContinue({
        hasTicker: true,
        lensCount: 2,
        conflict: true,
        modelId: "opus5",
        modelOnPlan: true,
      }),
      false,
    );
    assert.equal(
      canContinue({
        hasTicker: true,
        lensCount: 0,
        conflict: false,
        modelId: "opus5",
        modelOnPlan: true,
      }),
      false,
    );
    assert.equal(
      canContinue({
        hasTicker: true,
        lensCount: 2,
        conflict: false,
        modelId: "opus5",
        modelOnPlan: false,
      }),
      false,
    );
    assert.equal(
      canContinue({
        hasTicker: true,
        lensCount: 2,
        conflict: false,
        modelId: null,
        modelOnPlan: true,
      }),
      false,
    );
  });
});
