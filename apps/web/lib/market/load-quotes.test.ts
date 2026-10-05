import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { loadHoldingQuotes } from "./load-quotes";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("loadHoldingQuotes", () => {
  it("maps previous close by ticker and skips unknown exchanges", async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("MSFT")) {
        return new Response(
          JSON.stringify({
            chart: {
              result: [
                {
                  meta: { currency: "USD" },
                  timestamp: [1],
                  indicators: { quote: [{ close: [412.5] }] },
                },
              ],
            },
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    }) as typeof fetch;

    const quotes = await loadHoldingQuotes(
      [
        { ticker: "msft", exchange: "NASDAQ" },
        { ticker: "MSFT", exchange: "NASDAQ" },
        { ticker: "FOO", exchange: "UNKNOWN" },
      ],
      fetchImpl,
      new Date("2026-10-05T18:00:00Z"),
    );
    assert.equal(quotes.MSFT?.close, 412.5);
    assert.equal(quotes.MSFT?.currency, "USD");
    assert.equal(quotes.FOO, null);
  });

  it("returns empty quotes for an empty book and does not call fetch", async () => {
    let called = 0;
    const fetchImpl = (async () => {
      called += 1;
      return new Response("{}", { status: 500 });
    }) as typeof fetch;
    const quotes = await loadHoldingQuotes([], fetchImpl);
    assert.deepEqual(quotes, {});
    assert.equal(called, 0);
  });

  it("does not insert or update holding_lots", () => {
    const text = readFileSync(join(ROOT, "lib/market/load-quotes.ts"), "utf8");
    assert.equal(text.includes(".insert("), false);
    assert.equal(text.includes(".update("), false);
    assert.equal(text.includes('from("holding_lots")'), false);
    assert.equal(text.includes('from("holdings")'), false);
    assert.equal(text.includes("eod_quotes"), false);
  });
});
