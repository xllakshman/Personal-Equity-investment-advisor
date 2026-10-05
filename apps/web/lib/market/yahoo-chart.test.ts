import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  dropInProgressSession,
  lastChartClose,
  parseChartCloses,
  yahooChartUrl,
} from "./yahoo-chart";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("yahoo chart display helper", () => {
  it("builds the chart v8 URL and parses closes with currency", () => {
    assert.equal(
      yahooChartUrl("^IXIC", "1y", "1d"),
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EIXIC?range=1y&interval=1d",
    );
    const parsed = parseChartCloses(
      {
        chart: {
          result: [
            {
              meta: { currency: "usd" },
              timestamp: [1, 2, 3],
              indicators: { quote: [{ close: [10, null, 12.5] }] },
            },
          ],
        },
      },
      "MSFT",
    );
    assert.equal(parsed.length, 2);
    assert.equal(parsed[1]?.close, 12.5);
    assert.equal(parsed[1]?.currency, "USD");
  });

  it("drops today's in-progress bar and does not invent a close", () => {
    const todayTs = Date.parse("2026-10-05T15:00:00Z") / 1000;
    const prior = Date.parse("2026-10-02T20:00:00Z") / 1000;
    const now = new Date("2026-10-05T18:00:00Z");
    const dropped = dropInProgressSession(
      [
        { ts: prior, close: 10, currency: "USD" },
        { ts: todayTs, close: 11, currency: "USD" },
      ],
      now,
    );
    assert.equal(dropped.length, 1);
    assert.equal(dropped[0]?.close, 10);
    assert.deepEqual(parseChartCloses({}, "MSFT"), []);
    assert.equal(lastChartClose([]), null);
    assert.deepEqual(lastChartClose([{ ts: 1, close: 12, currency: "USD" }]), {
      close: 12,
      currency: "USD",
    });
  });

  it("does not insert or update holding_lots", () => {
    const text = readFileSync(
      join(ROOT, "lib/market/yahoo-chart.ts"),
      "utf8",
    );
    assert.equal(text.includes("holding_lots"), false);
    assert.equal(text.includes(".insert("), false);
    assert.equal(text.includes(".update("), false);
    assert.equal(text.includes("from(\"holdings\")"), false);
    assert.equal(text.includes("eod_quotes"), false);
  });
});
