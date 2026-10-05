import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadPortfolioTrend, trendLotsFromHoldings } from "./load-portfolio-trend";

describe("loadPortfolioTrend", () => {
  it("skips unknown exchanges and empty qty; empty book does not fetch", async () => {
    assert.deepEqual(
      trendLotsFromHoldings([
        { ticker: "MSFT", qty: 2, exchange: "NASDAQ", native_currency: "USD" },
        { ticker: "FOO", qty: 1, exchange: "LSE", native_currency: "GBP" },
        { ticker: "ZERO", qty: 0, exchange: "NASDAQ", native_currency: "USD" },
      ]),
      [{ ticker: "MSFT", yahooSymbol: "MSFT", qty: 2, nativeCurrency: "USD" }],
    );
    let calls = 0;
    const empty = await loadPortfolioTrend([], "USD", null, async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    });
    assert.equal(empty.emptyBook, true);
    assert.equal(empty.unavailable, true);
    assert.equal(calls, 0);
    assert.equal(empty.periods.yearly.portfolioPct, null);
  });

  it("builds periods from mocked Yahoo JSON and never writes lots", async () => {
    const day = 86400;
    const start = Date.UTC(2026, 8, 1) / 1000;
    const timestamps = Array.from({ length: 12 }, (_, i) => start + i * day);
    const chart = (closes: number[]) => ({
      chart: {
        result: [
          {
            meta: { currency: "USD" },
            timestamp: timestamps,
            indicators: { quote: [{ close: closes }] },
          },
        ],
      },
    });
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      assert.equal(url.includes("holding_lots"), false);
      if (url.includes("MSFT")) {
        return Response.json(chart(timestamps.map((_, i) => 100 + i)));
      }
      if (url.includes("%5EIXIC") || url.includes("^IXIC")) {
        return Response.json(chart(timestamps.map((_, i) => 200 + i)));
      }
      return Response.json(chart(timestamps.map((_, i) => 300 + i)));
    };
    const trend = await loadPortfolioTrend(
      [{ ticker: "MSFT", qty: 3, exchange: "NASDAQ", native_currency: "USD" }],
      "USD",
      null,
      fetchImpl,
    );
    assert.equal(trend.emptyBook, false);
    assert.equal(trend.unavailable, false);
    assert.ok((trend.periods.yearly.portfolioPct ?? 0) > 0);
    assert.equal(trend.periods.yearly.dates.length > 1, true);
  });
});
