import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { allocationNote, allocationPct, moneyAmount, modelCost } from "./format";

describe("display money and allocation", () => {
  it("formats Maya MSFT 30 × 403 as currency, not a raw 12090", () => {
    assert.equal(moneyAmount(12090, "USD"), "$12,090");
    assert.notEqual(moneyAmount(12090, "USD"), "12090");
  });

  it("does not throw on an invalid currency code", () => {
    assert.match(moneyAmount(10, "ZZZ"), /10/);
  });

  it("returns 0% for empty, NaN, or non-positive book", () => {
    assert.equal(allocationPct(12090, 0), 0);
    assert.equal(allocationPct(Number.NaN, 150000), 0);
    assert.equal(allocationPct(100, Number.POSITIVE_INFINITY), 0);
    assert.equal(allocationPct(11270, 150000) > 0, true);
  });

  it("flags a concentrated or tiny sleeve", () => {
    assert.match(allocationNote(40), /flag the risk/);
    assert.match(allocationNote(1), /small position/);
    assert.match(allocationNote(10), /normal size/);
  });

  it("shows model cost in dollars", () => {
    assert.equal(modelCost(180), "$1.80");
    assert.equal(modelCost(0), "$0.00");
  });
});
