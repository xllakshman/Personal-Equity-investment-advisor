import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { waitHeadline, waitLede, waitStatusLabel, waitStepIndex } from "./wait-status";

describe("wait panel vs request status", () => {
  it("maps worker statuses to the highlighted step", () => {
    assert.equal(waitStepIndex("queued"), 0);
    assert.equal(waitStepIndex("gathering"), 1);
    assert.equal(waitStepIndex("drafting"), 3);
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
    assert.match(waitLede("queued"), /Usually 40 to 90 seconds/);
    assert.match(waitLede("ready"), /note is ready/i);
    assert.match(waitLede("failed"), /did not finish/);
  });
});
