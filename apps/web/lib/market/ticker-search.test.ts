import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseTickerSearch } from "./ticker-search";

describe("parseTickerSearch", () => {
  it("keeps equities and maps BRK-B / .NS", () => {
    const hits = parseTickerSearch({
      quotes: [
        {
          quoteType: "EQUITY",
          symbol: "MSFT",
          shortname: "Microsoft Corporation",
          exchDisp: "NASDAQ",
        },
        {
          quoteType: "EQUITY",
          symbol: "BRK-B",
          shortname: "Berkshire Hathaway",
          exchange: "NYSE",
        },
        {
          quoteType: "EQUITY",
          symbol: "HDFCBANK.NS",
          shortname: "HDFC Bank",
          exchDisp: "NSE",
        },
        { quoteType: "OPTION", symbol: "MSFT240119C00400000" },
      ],
    });
    assert.equal(hits.length, 3);
    assert.equal(hits[0]?.ticker, "MSFT");
    assert.equal(hits[1]?.ticker, "BRK.B");
    assert.equal(hits[2]?.ticker, "HDFCBANK");
  });

  it("returns empty on junk", () => {
    assert.deepEqual(parseTickerSearch(null), []);
    assert.deepEqual(parseTickerSearch({ quotes: [] }), []);
  });
});
