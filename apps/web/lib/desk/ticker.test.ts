import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { tickerSearchHref, tickerSearchTarget } from "./ticker";

const MAYA = ["MSFT", "TSM", "UNH", "HDFCBANK", "BRK.B"];

describe("tickerSearchTarget", () => {
  it("does nothing on empty or whitespace", () => {
    assert.deepEqual(tickerSearchTarget("  ", MAYA), { kind: "empty" });
    assert.equal(tickerSearchHref({ kind: "empty" }), null);
  });

  it("uppercases a held ticker onto /analyse", () => {
    const t = tickerSearchTarget("tsm", MAYA);
    assert.deepEqual(t, { kind: "analyse", ticker: "TSM" });
    assert.equal(tickerSearchHref(t), "/analyse?ticker=TSM");
  });

  it("sends an unknown ticker to /portfolio?add=", () => {
    const t = tickerSearchTarget("zzzz", MAYA);
    assert.deepEqual(t, { kind: "add", ticker: "ZZZZ" });
    assert.equal(tickerSearchHref(t), "/portfolio?add=ZZZZ");
  });
});
