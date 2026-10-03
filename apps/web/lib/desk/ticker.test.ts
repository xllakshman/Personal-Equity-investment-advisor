import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { tickerSearchHref, tickerSearchTarget } from "./ticker";

describe("tickerSearchTarget", () => {
  it("opens the Analyse builder on empty or whitespace", () => {
    assert.deepEqual(tickerSearchTarget("  "), { kind: "empty" });
    assert.equal(tickerSearchHref({ kind: "empty" }), "/analyse");
  });

  it("uppercases a ticker onto /analyse whether or not it is held", () => {
    const held = tickerSearchTarget("tsm");
    assert.deepEqual(held, { kind: "analyse", ticker: "TSM" });
    assert.equal(tickerSearchHref(held), "/analyse?ticker=TSM");
    const unknown = tickerSearchTarget("zzzz");
    assert.deepEqual(unknown, { kind: "analyse", ticker: "ZZZZ" });
    assert.equal(tickerSearchHref(unknown), "/analyse?ticker=ZZZZ");
    assert.equal(tickerSearchHref(tickerSearchTarget("hdfcbank.ns")), "/analyse?ticker=HDFCBANK");
  });
});
