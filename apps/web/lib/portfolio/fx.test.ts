import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_USD_INR, displayFxRate, roundUsdInr, sumDisplayCost, toDisplayAmount } from "./fx";

describe("toDisplayAmount", () => {
  it("converts USD to INR only in the renderer", () => {
    const native = 10;
    const shown = toDisplayAmount(native, "USD", "INR", 80);
    assert.equal(shown, 800);
    assert.equal(native, 10);
  });

  it("converts INR to USD", () => {
    assert.equal(toDisplayAmount(800, "INR", "USD", 80), 10);
  });

  it("leaves matching currency unchanged", () => {
    assert.equal(toDisplayAmount(402.5, "USD", "USD", 88.4), 402.5);
  });

  it("uses the display default when override is missing", () => {
    assert.equal(displayFxRate(null), DEFAULT_USD_INR);
    assert.equal(displayFxRate(0), DEFAULT_USD_INR);
    assert.equal(displayFxRate(90), 90);
    assert.equal(roundUsdInr(95.086), 95.09);
    assert.equal(displayFxRate(95.086), 95.09);
  });

  it("does not write converted amounts — native stays native", () => {
    const native = 12090;
    const shown = toDisplayAmount(native, "USD", "INR", 88.4);
    assert.equal(shown > native, true);
    assert.equal(native, 12090);
    assert.equal(toDisplayAmount(Number.NaN, "USD", "INR", 88.4), 0);
    assert.equal(toDisplayAmount(10, "EUR", "USD", 88.4), 10);
  });

  it("sums qty × cost into the account display currency without mutating lots", () => {
    const lots = [
      { qty: 2, cost_per_share: 10, native_currency: "USD" },
      { qty: 1, cost_per_share: 800, native_currency: "INR" },
    ];
    assert.equal(sumDisplayCost(lots, "USD", 80), 30);
    assert.equal(sumDisplayCost(lots, "INR", 80), 2400);
    assert.equal(lots[0]?.cost_per_share, 10);
    assert.equal(sumDisplayCost([], "USD", 80), 0);
  });
});
