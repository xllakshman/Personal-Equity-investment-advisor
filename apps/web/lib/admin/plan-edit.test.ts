import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parsePlanEdit, parseThesisClass, priceUsdChoices, limitChoices } from "./plan-edit";

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
  it("accepts the five locked fields and converts USD to cents", () => {
    const parsed = parsePlanEdit(
      form({
        planId: "plan-basic",
        monthly_analysis_limit: "6",
        price_usd: "19",
        weekly_digest_ticker_limit: "3",
        is_active: "true",
        model_id: ["gpt56m"],
        who_copy: "A few names, checked properly.",
        why_copy: "Quick agents only. Five full notes a month.",
        notice_60: "60%",
        notice_80: "80%",
        notice_90: "90%",
        notice_100: "100%",
      }),
      CATALOG,
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.value.monthlyAnalysisLimit, 6);
    assert.equal(parsed.value.priceCents, 1900);
    assert.deepEqual(parsed.value.allowedModelIds, ["gpt56m"]);
    assert.equal(parsed.value.isActive, true);
  });

  it("rejects empty ticker-less model list and unknown catalog ids", () => {
    const none = parsePlanEdit(
      form({
        planId: "plan-basic",
        monthly_analysis_limit: "5",
        price_usd: "19",
        weekly_digest_ticker_limit: "3",
        is_active: "true",
        who_copy: "Who",
        why_copy: "Why",
        notice_60: "60",
        notice_80: "80",
        notice_90: "90",
        notice_100: "100",
      }),
      CATALOG,
    );
    assert.equal(none.ok, false);
    const ghost = parsePlanEdit(
      form({
        planId: "plan-basic",
        monthly_analysis_limit: "5",
        price_usd: "19",
        weekly_digest_ticker_limit: "3",
        is_active: "true",
        model_id: ["gemini31p"],
        who_copy: "Who",
        why_copy: "Why",
        notice_60: "60",
        notice_80: "80",
        notice_90: "90",
        notice_100: "100",
      }),
      CATALOG,
    );
    assert.equal(ghost.ok, false);
  });

  it("keeps a current limit that is not in the preset list", () => {
    assert.deepEqual(limitChoices(7).includes(7), true);
    assert.deepEqual(priceUsdChoices(1900).includes(19), true);
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
