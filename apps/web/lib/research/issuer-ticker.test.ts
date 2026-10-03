import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  eliteMatchWatch,
  matchTicker,
  normalizeIssuer,
  parseSecCompanyTickers,
} from "./issuer-ticker";

describe("normalizeIssuer", () => {
  it("strips corp noise", () => {
    assert.equal(normalizeIssuer("APPLE INC"), "APPLE");
    assert.equal(normalizeIssuer("Coca-Cola Co"), "COCA COLA");
    assert.equal(normalizeIssuer(""), "");
  });
});

describe("parseSecCompanyTickers", () => {
  it("reads the SEC map and skips junk", () => {
    const rows = parseSecCompanyTickers({
      "0": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
      "1": { ticker: "KO", title: "Coca-Cola Co" },
      "2": { ticker: "", title: "Nope" },
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.ticker, "AAPL");
    assert.deepEqual(parseSecCompanyTickers(null), []);
    assert.deepEqual(parseSecCompanyTickers([]), []);
  });
});

describe("matchTicker", () => {
  const catalog = [
    { title: "Apple Inc.", ticker: "AAPL" },
    { title: "Coca-Cola Co", ticker: "KO" },
    { title: "Berkshire Hathaway Inc Class B", ticker: "BRK.B" },
  ];

  it("maps a 13F issuer to a catalog ticker", () => {
    assert.equal(matchTicker("APPLE INC", catalog), "AAPL");
    assert.equal(matchTicker("COCA COLA CO", catalog), "KO");
  });

  it("returns null on empty or unknown", () => {
    assert.equal(matchTicker("", catalog), null);
    assert.equal(matchTicker("UNKNOWN ISSUER LLC", catalog), null);
    assert.equal(matchTicker("APPLE INC", []), null);
  });
});

describe("eliteMatchWatch", () => {
  const rows = [
    { slug: "buffett", name: "Warren Buffett", firm: "Berkshire Hathaway" },
    { slug: "lynch", name: "Peter Lynch", firm: "Formerly Fidelity Magellan" },
  ];
  it("matches name, firm, or unique substring", () => {
    assert.equal(eliteMatchWatch("Warren Buffett", rows)?.slug, "buffett");
    assert.equal(eliteMatchWatch("berkshire hathaway", rows)?.slug, "buffett");
    assert.equal(eliteMatchWatch("lynch", rows)?.slug, "lynch");
    assert.equal(eliteMatchWatch("nobody", rows), null);
    assert.equal(eliteMatchWatch("  ", rows), null);
  });
});
