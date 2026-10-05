import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aggregateUnrealizedPct,
  formatPnlPct,
  holdingDisplayPnl,
} from "./unrealized-pnl";

describe("holdingDisplayPnl", () => {
  it("is (display market − cost) / cost from qty × close", () => {
    const row = holdingDisplayPnl({
      qty: 10,
      costPerShare: 100,
      nativeCurrency: "USD",
      quote: { close: 120, currency: "USD" },
      displayCurrency: "USD",
      fxUsdInr: 80,
    });
    assert.equal(row.displayCost, 1000);
    assert.equal(row.displayMarket, 1200);
    assert.equal(row.unrealized, 200);
    assert.equal(row.unrealizedPct, 20);
  });

  it("converts both sides with display FX and does not write the native cost", () => {
    const nativeCost = 100;
    const row = holdingDisplayPnl({
      qty: 2,
      costPerShare: nativeCost,
      nativeCurrency: "USD",
      quote: { close: 150, currency: "USD" },
      displayCurrency: "INR",
      fxUsdInr: 80,
    });
    assert.equal(nativeCost, 100);
    assert.equal(row.displayCost, 16000);
    assert.equal(row.displayMarket, 24000);
    assert.equal(row.unrealizedPct, 50);
  });

  it("returns null % when the quote is missing, failed, or cost is 0", () => {
    const empty = holdingDisplayPnl({
      qty: 10,
      costPerShare: 100,
      nativeCurrency: "USD",
      quote: null,
      displayCurrency: "USD",
      fxUsdInr: 88.4,
    });
    assert.equal(empty.displayMarket, null);
    assert.equal(empty.unrealizedPct, null);

    const zeroCost = holdingDisplayPnl({
      qty: 10,
      costPerShare: 0,
      nativeCurrency: "USD",
      quote: { close: 12, currency: "USD" },
      displayCurrency: "USD",
      fxUsdInr: 88.4,
    });
    assert.equal(zeroCost.unrealizedPct, null);
  });
});

describe("aggregateUnrealizedPct / formatPnlPct", () => {
  it("totals only when every row has a quote; empty or partial → null", () => {
    assert.equal(aggregateUnrealizedPct([]), null);
    assert.equal(
      aggregateUnrealizedPct([
        { displayCost: 1000, displayMarket: 1200 },
        { displayCost: 500, displayMarket: 400 },
      ]),
      (100 * (1600 - 1500)) / 1500,
    );
    assert.equal(
      aggregateUnrealizedPct([
        { displayCost: 1000, displayMarket: 1200 },
        { displayCost: 500, displayMarket: null },
      ]),
      null,
    );
  });

  it("formats +12.3% and uses an em dash, never 0% for missing data", () => {
    assert.equal(formatPnlPct(12.34), "+12.3%");
    assert.equal(formatPnlPct(-4), "-4.0%");
    assert.equal(formatPnlPct(0), "0.0%");
    assert.equal(formatPnlPct(null), "—");
    assert.equal(formatPnlPct(Number.NaN), "—");
  });
});
