import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parsePlanEdit,
  parsePlanShared,
  parseThesisClass,
  priceUsdChoices,
  limitChoices,
  sharedPlanDefaults,
} from "./plan-edit";

const CATALOG = ["gpt56m", "opus5"];

function form(pairs: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(pairs)) {
    if (Array.isArray(v)) v.forEach((item) => f.append(k, item));
    else f.set(k, v);
  }
  return f;
}

describe("parsePlanEdit", () => {
  it("accepts the per-plan fields and converts USD to cents", () => {
    const parsed = parsePlanEdit(
      form({
        planId: "plan-basic",
        monthly_analysis_limit: "6",
        price_usd: "19",
        weekly_digest_ticker_limit: "3",
        is_active: "true",
        why_copy: "Quick agents only. Five full notes a month.",
        notice_60: "60%",
        notice_80: "80%",
        notice_90: "90%",
        notice_100: "100%",
      }),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.value.monthlyAnalysisLimit, 6);
    assert.equal(parsed.value.priceCents, 1900);
    assert.equal(parsed.value.isActive, true);
    assert.equal(parsed.value.whyCopy.startsWith("Quick"), true);
  });

  it("rejects missing why-copy and notices", () => {
    const none = parsePlanEdit(
      form({
        planId: "plan-basic",
        monthly_analysis_limit: "5",
        price_usd: "19",
        weekly_digest_ticker_limit: "3",
        is_active: "true",
        notice_60: "60",
        notice_80: "80",
        notice_90: "90",
        notice_100: "100",
      }),
    );
    assert.equal(none.ok, false);
  });

  it("keeps a current limit that is not in the preset list", () => {
    assert.deepEqual(limitChoices(7).includes(7), true);
    assert.deepEqual(priceUsdChoices(1900).includes(19), true);
  });
});

describe("parsePlanShared", () => {
  it("accepts agents and who-copy for every plan", () => {
    const parsed = parsePlanShared(
      form({
        model_id: ["gpt56m", "opus5"],
        who_copy: "A few names, checked properly.",
      }),
      CATALOG,
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.value.allowedModelIds, ["gpt56m", "opus5"]);
    assert.equal(parsed.value.whoCopy, "A few names, checked properly.");
  });

  it("rejects empty agent list, unknown catalog ids, and blank who-copy", () => {
    const none = parsePlanShared(form({ who_copy: "Who" }), CATALOG);
    assert.equal(none.ok, false);
    const ghost = parsePlanShared(
      form({ model_id: ["gemini31p"], who_copy: "Who" }),
      CATALOG,
    );
    assert.equal(ghost.ok, false);
    const blankWho = parsePlanShared(form({ model_id: ["gpt56m"], who_copy: "  " }), CATALOG);
    assert.equal(blankWho.ok, false);
  });
});

describe("sharedPlanDefaults", () => {
  it("unions agent ids and takes the first who-copy", () => {
    const shared = sharedPlanDefaults([
      { allowedModelIds: ["gpt56m"], whoCopy: "Judge the notes before you pay." },
      { allowedModelIds: ["gpt56m", "opus5"], whoCopy: "A working book." },
    ]);
    assert.deepEqual(shared.allowedModelIds, ["gpt56m", "opus5"]);
    assert.equal(shared.whoCopy, "Judge the notes before you pay.");
  });

  it("returns empty agents and who-copy when there are no plans", () => {
    assert.deepEqual(sharedPlanDefaults([]), { allowedModelIds: [], whoCopy: "" });
  });
});

describe("parseThesisClass", () => {
  it("accepts Frontier and Quick", () => {
    assert.deepEqual(parseThesisClass("frontier"), { ok: true, value: "frontier" });
    assert.deepEqual(parseThesisClass("Quick"), { ok: true, value: "quick" });
  });

  it("rejects empty and unknown class", () => {
    assert.equal(parseThesisClass("").ok, false);
    assert.equal(parseThesisClass("haiku").ok, false);
  });
});
