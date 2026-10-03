import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { displayRateThisLoad, parseUsdInrPayload } from "./fx-live";
import { roundUsdInr } from "./fx";

describe("parseUsdInrPayload", () => {
  it("rounds a live rate to two decimals", () => {
    assert.equal(parseUsdInrPayload({ rates: { INR: 95.086 } }), 95.09);
    assert.equal(parseUsdInrPayload({ rates: { INR: 83.1 } }), 83.1);
  });

  it("rejects empty or non-positive junk", () => {
    assert.equal(parseUsdInrPayload(null), null);
    assert.equal(parseUsdInrPayload({}), null);
    assert.equal(parseUsdInrPayload({ rates: { INR: 0 } }), null);
    assert.equal(parseUsdInrPayload({ rates: { INR: "nope" } }), null);
  });
});

describe("displayRateThisLoad", () => {
  it("prefers the internet rate, then a saved override", () => {
    assert.deepEqual(displayRateThisLoad(95.09, 88.4), { rate: 95.09, source: "live" });
    assert.deepEqual(displayRateThisLoad(null, 90.125), { rate: 90.13, source: "saved" });
    assert.equal(displayRateThisLoad(null, null).source, "default");
  });
});

describe("roundUsdInr", () => {
  it("keeps two digits", () => {
    assert.equal(roundUsdInr(95.086), 95.09);
    assert.equal(roundUsdInr(95.09), 95.09);
  });
});
