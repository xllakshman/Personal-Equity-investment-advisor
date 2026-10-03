import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analyseGuide,
  analyseRailItemClass,
  analyseStepsDone,
  firstOpenStep,
} from "./steps";

describe("analyseStepsDone", () => {
  it("greens checks, risk, tax, and agent as soon as those fields are set", () => {
    const done = analyseStepsDone({
      hasTicker: false,
      lensCount: 2,
      conflict: false,
      hasTaxResidency: true,
      modelOnPlan: true,
    });
    assert.deepEqual(done, [false, true, false, true, true, true]);
    assert.equal(firstOpenStep(done), 1);
    assert.match(analyseGuide(done), /Step 1/);
    assert.equal(analyseRailItemClass(true, false), "bld__rail-item bld__rail-item--done");
    assert.equal(analyseRailItemClass(false, true), "bld__rail-item bld__rail-item--cur");
    assert.equal(analyseRailItemClass(true, true), "bld__rail-item bld__rail-item--done");
  });

  it("asks for a check after a ticker is set", () => {
    const done = analyseStepsDone({
      hasTicker: true,
      lensCount: 0,
      conflict: false,
      hasTaxResidency: true,
      modelOnPlan: true,
    });
    assert.equal(done[0], true);
    assert.equal(done[1], false);
    assert.equal(firstOpenStep(done), 2);
  });

  it("blocks on a risk/return mismatch", () => {
    const done = analyseStepsDone({
      hasTicker: true,
      lensCount: 1,
      conflict: true,
      hasTaxResidency: true,
      modelOnPlan: true,
    });
    assert.equal(firstOpenStep(done), 4);
    assert.match(analyseGuide(done), /Risk and return/);
  });

  it("says all six are complete when Submit can run", () => {
    const done = analyseStepsDone({
      hasTicker: true,
      lensCount: 2,
      conflict: false,
      hasTaxResidency: true,
      modelOnPlan: true,
    });
    assert.ok(done.every(Boolean));
    assert.match(analyseGuide(done), /All six steps are complete/);
  });
});
