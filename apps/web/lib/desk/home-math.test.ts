import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  allocationWeights,
  costBasisNative,
  lastCheckedLabel,
  totalPortfolioUsd,
} from "./home-math";

describe("costBasisNative", () => {
  it("sums qty × last cost, not a live price", () => {
    const rows = [
      {
        ticker: "MSFT",
        company_name: "Microsoft",
        qty: 2,
        cost_per_share: 10,
        native_currency: "USD",
        exchange: "NASDAQ",
        last_checked_at: null,
        lot_kind: "retail" as const,
      },
      {
        ticker: "TSM",
        company_name: null,
        qty: 1,
        cost_per_share: 5,
        native_currency: "USD",
        exchange: "NASDAQ",
        last_checked_at: null,
        lot_kind: "esop" as const,
      },
    ];
    assert.equal(costBasisNative(rows), 25);
    assert.deepEqual(allocationWeights(rows), [
      { ticker: "MSFT", pct: 80 },
      { ticker: "TSM", pct: 20 },
    ]);
  });

  it("handles empty book, NaN qty, and a bad last-checked timestamp", () => {
    assert.equal(costBasisNative([]), 0);
    assert.equal(
      costBasisNative([
        {
          ticker: "MSFT",
          company_name: null,
          qty: Number.NaN,
          cost_per_share: 403,
          native_currency: "USD",
          exchange: "NASDAQ",
          last_checked_at: null,
          lot_kind: "retail" as const,
        },
      ]),
      0,
    );
    assert.deepEqual(
      allocationWeights([
        {
          ticker: "CASH",
          company_name: null,
          qty: 0,
          cost_per_share: 0,
          native_currency: "USD",
          exchange: "NASDAQ",
          last_checked_at: null,
          lot_kind: "retail" as const,
        },
      ]),
      [{ ticker: "CASH", pct: 0 }],
    );
    assert.equal(lastCheckedLabel("not-a-date"), "never");
  });
});

describe("lastCheckedLabel", () => {
  it("says never when there is no report", () => {
    assert.equal(lastCheckedLabel(null), "never");
  });
});

describe("totalPortfolioUsd", () => {
  it("adds equity display and stored cash in USD", () => {
    assert.equal(
      totalPortfolioUsd({
        equityDisplay: 10000,
        cashUsd: 2500,
        displayCurrency: "USD",
      }),
      12500,
    );
  });

  it("shows null when cash was never stored, including empty book", () => {
    assert.equal(
      totalPortfolioUsd({
        equityDisplay: 10000,
        cashUsd: null,
        displayCurrency: "USD",
      }),
      null,
    );
    assert.equal(
      totalPortfolioUsd({
        equityDisplay: 0,
        cashUsd: null,
        displayCurrency: "USD",
      }),
      null,
    );
  });

  it("treats stored 0 as cash, so total equals equity", () => {
    assert.equal(
      totalPortfolioUsd({
        equityDisplay: 10000,
        cashUsd: 0,
        displayCurrency: "USD",
      }),
      10000,
    );
  });

  it("does not FX-convert cash when the desk shows INR", () => {
    assert.equal(
      totalPortfolioUsd({
        equityDisplay: 884000,
        cashUsd: 2500,
        displayCurrency: "INR",
      }),
      null,
    );
  });

  it("does not invent a total from NaN equity", () => {
    assert.equal(
      totalPortfolioUsd({
        equityDisplay: Number.NaN,
        cashUsd: 100,
        displayCurrency: "USD",
      }),
      null,
    );
  });
});
