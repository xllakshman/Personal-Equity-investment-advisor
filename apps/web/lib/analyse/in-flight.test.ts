import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyseRunningChip, analyseRunningHint, analyseWaitHref, isInFlightStatus } from "./in-flight";

describe("isInFlightStatus", () => {
  it("blocks Submit while a request is not terminal", () => {
    assert.equal(isInFlightStatus("queued"), true);
    assert.equal(isInFlightStatus("gathering"), true);
    assert.equal(isInFlightStatus("drafting"), true);
    assert.equal(isInFlightStatus("checking"), true);
    assert.equal(isInFlightStatus("rendering"), true);
  });

  it("allows Submit after ready, failed, or rejected", () => {
    assert.equal(isInFlightStatus("ready"), false);
    assert.equal(isInFlightStatus("failed"), false);
    assert.equal(isInFlightStatus("rejected"), false);
    assert.equal(isInFlightStatus(""), false);
  });
});

describe("analyseWaitHref", () => {
  it("opens the wait page for that request id", () => {
    assert.equal(
      analyseWaitHref("11111111-1111-4111-8111-111111111111"),
      "/analyse/11111111-1111-4111-8111-111111111111",
    );
    assert.equal(analyseRunningHint("MSFT"), "MSFT — watch progress");
    assert.equal(analyseRunningChip("MSFT"), "MSFT · in progress");
  });
});
