import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  investingWaitMessage,
  waitHeadline,
  waitLede,
  waitProgressPct,
  waitStatusLabel,
  waitStepIndex,
} from "./wait-status";

describe("wait panel vs request status", () => {
  it("maps worker statuses to the highlighted step", () => {
    assert.equal(waitStepIndex("queued"), 0);
    assert.equal(waitStepIndex("gathering"), 1);
    assert.equal(waitStepIndex("drafting"), 2);
    assert.equal(waitStepIndex("checking"), 3);
    assert.equal(waitStepIndex("rendering"), 4);
    assert.equal(waitStepIndex("ready"), 4);
    assert.equal(waitStepIndex("nope"), 0);
  });

  it("does not pretend ready while queued", () => {
    assert.equal(waitHeadline("queued"), "working");
    assert.equal(waitHeadline("ready"), "ready");
    assert.equal(waitHeadline("failed"), "failed");
    assert.equal(waitHeadline("rejected"), "failed");
    assert.equal(waitStatusLabel("queued"), "In progress");
    assert.match(waitLede("queued"), /progress view after Submit/);
    assert.match(waitLede("ready"), /note is ready/i);
    assert.match(waitLede("failed"), /did not finish/);
  });

  it("shows a rising percent while the worker runs", () => {
    assert.equal(waitProgressPct("queued") < waitProgressPct("gathering"), true);
    assert.equal(waitProgressPct("gathering") < waitProgressPct("drafting"), true);
    assert.equal(waitProgressPct("drafting") < waitProgressPct("checking"), true);
    assert.equal(waitProgressPct("ready"), 100);
    assert.equal(waitProgressPct("failed"), 0);
  });

  it("rotates investing copy without using the system prompt", () => {
    assert.match(investingWaitMessage(0), /value/i);
    assert.notEqual(investingWaitMessage(0), investingWaitMessage(1));
    assert.equal(investingWaitMessage(12), investingWaitMessage(0));
  });
});
