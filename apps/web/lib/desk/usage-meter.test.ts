import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analysesThisCycleCaption,
  isUsageMeterKind,
  meterEventCount,
  quotaExhausted,
  USAGE_METER_KINDS,
} from "./usage-meter";

describe("usage meter kinds", () => {
  it("counts search, refine, and refine_gate against the plan", () => {
    assert.deepEqual(USAGE_METER_KINDS, ["search", "refine", "refine_gate"]);
    assert.equal(isUsageMeterKind("search"), true);
    assert.equal(isUsageMeterKind("refine_gate"), true);
    assert.equal(isUsageMeterKind("prompt_extract_attempt"), false);
    assert.equal(isUsageMeterKind("pdf"), false);
    assert.equal(isUsageMeterKind(""), false);
  });

  it("quota at 100% blocks the next run", () => {
    assert.equal(quotaExhausted(20, 20), true);
    assert.equal(quotaExhausted(19, 20), false);
    assert.equal(quotaExhausted(0, 0), true);
    assert.equal(quotaExhausted(5, null), false);
  });

  it("ignores extract and pdf when summing the KPI", () => {
    assert.equal(
      meterEventCount([
        "search",
        "refine",
        "refine_gate",
        "prompt_extract_attempt",
        "pdf",
      ]),
      3,
    );
    assert.equal(meterEventCount([]), 0);
  });

  it("names the same kinds the SQL meter counts", () => {
    assert.match(
      analysesThisCycleCaption("Professional"),
      /search, refine, refine_gate/,
    );
    assert.match(analysesThisCycleCaption("Professional"), /Professional/);
    assert.equal(
      analysesThisCycleCaption(null).includes("Professional"),
      false,
    );
  });
});
