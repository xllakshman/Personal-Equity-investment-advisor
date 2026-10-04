import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  moneyCents,
  noteDocument,
  sectionText,
  stripTags,
  visibleSectionKeys,
  isFinishedNote,
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

  it("hides inflight retrieval dumps and formats nested prose", () => {
    const inflight = {
      stage_status: { stage_1_data_acquisition: "IN_PROGRESS" },
      retrieval_1_price_and_cap: { status: "COMPLETE", current_price: 728.08 },
    };
    assert.equal(isFinishedNote(inflight), false);
    assert.deepEqual(visibleSectionKeys(inflight, true), []);
    const note = {
      verdict: { call: "Hold", note: "Keep the position." },
      moat: { adherence: "YES", note: "Network effects still hold." },
    };
    assert.equal(isFinishedNote(note), true);
    const text = sectionText(note.verdict);
    assert.ok(text.includes("Hold"));
    assert.ok(text.includes("Keep the position."));
    assert.equal(text.includes("adherence"), false);
    const longform = {
      plain_language:
        "LAYER 1\nTHE BOTTOM LINE\nMeta at 728 sits between two capex treatments.\nWHAT THIS COMPANY DOES\nAds.",
      verdict: "Monitor",
    };
    assert.equal(isFinishedNote(longform), true);
    assert.ok(noteDocument(longform).includes("THE BOTTOM LINE"));
  });

  it("formats token cost as dollars", () => {
    assert.equal(moneyCents(0), "$0.00");
    assert.equal(moneyCents(42), "$0.42");
    assert.equal(moneyCents(12090), "$120.90");
    assert.equal(moneyCents(Number.NaN), "—");
  });
});
