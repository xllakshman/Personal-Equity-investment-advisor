import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parsePreviousClose, yahooSymbol } from "./yahoo-symbol";

describe("yahooSymbol", () => {
  it("maps US, NSE, BSE and BRK.B like the worker", () => {
    assert.equal(yahooSymbol("MSFT", "NASDAQ"), "MSFT");
    assert.equal(yahooSymbol("BRK.B", "NYSE"), "BRK-B");
    assert.equal(yahooSymbol("HDFCBANK", "NSE"), "HDFCBANK.NS");
    assert.equal(yahooSymbol("RELIANCE", "BSE"), "RELIANCE.BO");
    assert.equal(yahooSymbol("", "NASDAQ"), null);
    assert.equal(yahooSymbol("FOO", "LSE"), null);
  });
});

describe("parsePreviousClose", () => {
  it("takes the last finished close and skips nulls", () => {
    const parsed = parsePreviousClose(
      {
        chart: {
          result: [
            {
              meta: { currency: "usd" },
              indicators: { quote: [{ close: [10, null, 12.5] }] },
            },
          ],
        },
      },
      "MSFT",
    );
    assert.deepEqual(parsed, { yahooSymbol: "MSFT", close: 12.5, currency: "USD" });
  });

  it("returns null on empty chart", () => {
    assert.equal(parsePreviousClose({}, "MSFT"), null);
    assert.equal(parsePreviousClose({ chart: { result: [] } }, "MSFT"), null);
  });
});
