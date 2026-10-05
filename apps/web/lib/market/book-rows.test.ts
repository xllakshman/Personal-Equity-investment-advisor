import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bookMoney } from "./book-rows";

describe("bookMoney", () => {
  it("uses qty × cost for invested and previous close for value", () => {
    const row = bookMoney({
      qty: 10,
      costPerShare: 100,
      nativeCurrency: "USD",
      quote: { close: 120, currency: "USD" },
      investedTotal: 1000,
      valueTotal: 1200,
    });
    assert.equal(row.invested, 1000);
    assert.equal(row.price, 120);
    assert.equal(row.value, 1200);
    assert.equal(row.unrealized, 200);
    assert.equal(row.unrealizedPct, 20);
    assert.equal(row.realized, null);
    assert.equal(row.weightPct, 100);
  });

  it("does not mix quote currency with native cost", () => {
    const row = bookMoney({
      qty: 10,
      costPerShare: 18.4,
      nativeCurrency: "USD",
      quote: { close: 1500, currency: "INR" },
      investedTotal: 184,
      valueTotal: null,
    });
    assert.equal(row.price, null);
    assert.equal(row.value, null);
    assert.equal(row.unrealized, null);
    assert.equal(row.unrealizedPct, null);
    assert.equal(Math.round(row.weightPct), 100);
  });

  it("treats empty qty as zero invested", () => {
    const row = bookMoney({
      qty: Number.NaN,
      costPerShare: 10,
      nativeCurrency: "USD",
      quote: null,
      investedTotal: 0,
      valueTotal: null,
    });
    assert.equal(row.invested, 0);
    assert.equal(row.weightPct, 0);
  });
});
