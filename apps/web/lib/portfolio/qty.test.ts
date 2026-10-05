import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { qtyFromTotals, parseMoney, totalPurchasedDisplay } from "./qty";

describe("qtyFromTotals", () => {
  it("divides total purchased by native cost", () => {
    assert.equal(qtyFromTotals(11270, 402.5), 28);
  });

  it("refuses zero or empty cost", () => {
    assert.equal(qtyFromTotals(100, 0), null);
    assert.equal(qtyFromTotals(100, Number.NaN), null);
    assert.equal(parseMoney(""), null);
    assert.equal(parseMoney("$1,200.50"), 1200.5);
    assert.equal(parseMoney("$188.50"), 188.5);
    assert.equal(parseMoney("1,234.56"), 1234.56);
    assert.equal(parseMoney("USD 188.50"), 188.5);
    assert.equal(parseMoney("188.50"), 188.5);
    assert.equal(parseMoney("not-a-price"), null);
    assert.equal(parseMoney("   "), null);
  });
});

describe("totalPurchasedDisplay", () => {
  it("prefills qty × cost without FX and refuses empty book maths", () => {
    assert.equal(totalPurchasedDisplay(9, 438), "3942");
    assert.equal(totalPurchasedDisplay(28, 402.5), "11270");
    assert.equal(totalPurchasedDisplay(0, 400), "");
    assert.equal(totalPurchasedDisplay(10, 0), "");
    assert.equal(totalPurchasedDisplay(Number.NaN, 10), "");
  });
});
