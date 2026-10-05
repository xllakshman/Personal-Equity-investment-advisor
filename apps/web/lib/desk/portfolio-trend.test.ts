import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import type { ChartClose } from "../market/yahoo-chart";
import {
  alignTrendPoints,
  buildPeriodSeries,
  canConvertForTrend,
  formatIsoDate,
  formatTrendPct,
  indexTo100,
  markPortfolioAt,
  periodReturn,
  sessionReturn,
  type TrendLot,
} from "./portfolio-trend";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function bar(ts: number, close: number, currency = "USD"): ChartClose {
  return { ts, close, currency };
}

const DAY = 86400;
const t0 = Date.UTC(2026, 8, 1) / 1000;
const stamps = Array.from({ length: 10 }, (_, i) => t0 + i * DAY);

describe("portfolio trend math", () => {
  it("marks current lots at display prices and does not guess FX", () => {
    const lots: TrendLot[] = [
      { ticker: "MSFT", yahooSymbol: "MSFT", qty: 2, nativeCurrency: "USD" },
    ];
    const series = new Map<string, ChartClose[]>([
      ["MSFT", [bar(stamps[0]!, 100), bar(stamps[1]!, 110)]],
    ]);
    assert.equal(
      markPortfolioAt(lots, series, stamps[1]!, "USD", 88.4),
      220,
    );
    assert.equal(canConvertForTrend("EUR", "USD"), false);
    assert.equal(
      markPortfolioAt(
        [{ ticker: "AIR", yahooSymbol: "AIR.PA", qty: 1, nativeCurrency: "EUR" }],
        new Map([["AIR.PA", [bar(stamps[0]!, 10, "EUR")]]]),
        stamps[0]!,
        "USD",
        88.4,
      ),
      null,
    );
  });

  it("empty book yields no series; % and dates format for display", () => {
    const empty = alignTrendPoints([], new Map(), [], [], "USD", 88.4);
    assert.deepEqual(empty, []);
    const periods = buildPeriodSeries([]);
    assert.equal(periods.daily.portfolioPct, null);
    assert.equal(formatTrendPct(null), "—");
    assert.equal(formatTrendPct(0.123), "+12.3%");
    assert.equal(formatTrendPct(-0.05), "-5.0%");
    assert.equal(formatIsoDate("2026-10-05"), "5 Oct 2026");
    assert.equal(formatIsoDate(""), "—");
  });

  it("indexes to 100 and uses session return for daily", () => {
    assert.deepEqual(indexTo100([100, 110, null, 120]), [100, 110, null, 120]);
    assert.equal(periodReturn([80, 100]), 0.25);
    assert.equal(sessionReturn([100, 50, 100]), 1);
    const lots: TrendLot[] = [
      { ticker: "MSFT", yahooSymbol: "MSFT", qty: 1, nativeCurrency: "USD" },
    ];
    const msft = stamps.map((ts, i) => bar(ts, 100 + i));
    const nq = stamps.map((ts, i) => bar(ts, 200 + i));
    const sp = stamps.map((ts, i) => bar(ts, 300 + i));
    const aligned = alignTrendPoints(
      lots,
      new Map([["MSFT", msft]]),
      nq,
      sp,
      "USD",
      88.4,
    );
    assert.equal(aligned.length, 10);
    const periods = buildPeriodSeries(aligned);
    assert.ok(periods.yearly.portfolioPct != null);
    assert.equal(formatTrendPct(periods.yearly.portfolioPct).includes("%"), true);
  });

  it("read helpers never mention holding_lots writes", () => {
    for (const rel of [
      "lib/market/yahoo-chart.ts",
      "lib/desk/portfolio-trend.ts",
      "lib/desk/load-portfolio-trend.ts",
    ]) {
      const text = src(rel);
      assert.equal(text.includes("holding_lots"), false);
      assert.equal(text.includes(".insert("), false);
      assert.equal(text.includes(".update("), false);
      assert.equal(text.includes(".upsert("), false);
      assert.equal(text.includes("prompt_versions"), false);
    }
  });
});
