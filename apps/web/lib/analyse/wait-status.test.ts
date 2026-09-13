import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { waitHeadline, waitLede, waitStepIndex } from "./wait-status";

describe("wait panel vs analysis_requests.status", () => {
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
    assert.match(waitLede("queued"), /stays queued/);
    assert.match(waitLede("ready"), /reports row/i);
    assert.match(waitLede("failed"), /did not finish/);
  });
});
