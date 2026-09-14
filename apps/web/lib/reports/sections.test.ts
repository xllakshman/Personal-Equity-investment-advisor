import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  moneyCents,
  sectionText,
  stripTags,
  visibleSectionKeys,
} from "./sections";

describe("report sections display", () => {
  it("strips tags and never keeps script markup", () => {
    assert.equal(stripTags("<script>alert(1)</script>Hold"), "alert(1)Hold");
    assert.equal(sectionText({ verdict: "<b>Accumulate</b>" }).includes("<b>"), false);
  });

  it("Beginner hides expert-only keys; Expert keeps them", () => {
    const sections = {
      verdict: "Hold",
      moat: "cash",
      pre_buy: { bear_case: "competition" },
      construction: "core",
    };
    assert.deepEqual(visibleSectionKeys(sections, false), ["verdict", "moat"]);
    assert.ok(visibleSectionKeys(sections, true).includes("pre_buy"));
    assert.ok(visibleSectionKeys(sections, true).includes("construction"));
  });

  it("formats token cost as dollars", () => {
    assert.equal(moneyCents(0), "$0.00");
    assert.equal(moneyCents(42), "$0.42");
    assert.equal(moneyCents(12090), "$120.90");
    assert.equal(moneyCents(Number.NaN), "—");
  });
});
