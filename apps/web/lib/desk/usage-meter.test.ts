import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analysesThisCycleCaption,
  formatCreditAmount,
  isUsageMeterKind,
  meterCreditSum,
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

  it("quota at 100% blocks the next run, including 1.5 remainder", () => {
    assert.equal(quotaExhausted(20, 20), true);
    assert.equal(quotaExhausted(19, 20), false);
    assert.equal(quotaExhausted(79.5, 80), false);
    assert.equal(quotaExhausted(80, 80), true);
    assert.equal(quotaExhausted(80.5, 80), true);
    assert.equal(quotaExhausted(0, 0), true);
    assert.equal(quotaExhausted(5, null), false);
  });

  it("sums quantity like thesis_family_meter_count and ignores extract/pdf", () => {
    assert.equal(
      meterCreditSum([
        { kind: "search", quantity: 1.5 },
        { kind: "search", quantity: 1 },
        { kind: "refine", quantity: 1 },
        { kind: "refine_gate", quantity: 1 },
        { kind: "prompt_extract_attempt", quantity: 1 },
        { kind: "pdf", quantity: 1 },
      ]),
      4.5,
    );
    assert.equal(meterCreditSum([]), 0);
    assert.equal(meterCreditSum([{ kind: "search", quantity: null }]), 1);
    assert.equal(meterCreditSum([{ kind: "search" }]), 1);
    assert.equal(meterCreditSum([{ kind: "refine_gate", quantity: undefined }]), 1);
    assert.equal(meterEventCount(["search", "refine", "prompt_extract_attempt"]), 2);
  });

  it("formats 1.5 credits without leaking prompt text", () => {
    assert.equal(formatCreditAmount(1.5), "1.5");
    assert.equal(formatCreditAmount(1), "1");
    assert.equal(formatCreditAmount(80), "80");
    assert.equal(formatCreditAmount(Number.NaN), "0");
    assert.equal(formatCreditAmount(1.5).includes("prompt"), false);
  });

  it("names the plan in plain English", () => {
    assert.equal(
      analysesThisCycleCaption("Professional"),
      "Professional plan",
    );
    assert.equal(analysesThisCycleCaption(null), "Trial plan");
    assert.equal(
      analysesThisCycleCaption("Professional").includes("refine_gate"),
      false,
    );
  });
});
