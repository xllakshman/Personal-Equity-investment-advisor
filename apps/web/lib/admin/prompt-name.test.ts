import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parsePromptRole, promptNameSuffix, promptVersionName } from "./prompt-name";

describe("promptVersionName", () => {
  it("appends IST YYYY-Month-Date: HH:MM:SS", () => {
    const at = new Date("2026-10-03T15:30:07Z");
    const suffix = promptNameSuffix(at);
    assert.match(suffix, /^\d{4}-[A-Za-z]+-\d{2}: \d{2}:\d{2}:\d{2}$/);
    assert.equal(suffix, "2026-October-03: 21:00:07");
    assert.equal(
      promptVersionName("Advisor core", at),
      "Advisor core-2026-October-03: 21:00:07",
    );
  });

  it("replaces an existing suffix instead of stacking", () => {
    const at = new Date("2026-10-03T15:30:07Z");
    assert.equal(
      promptVersionName("Advisor core-2026-January-01: 00:00:00", at),
      "Advisor core-2026-October-03: 21:00:07",
    );
  });

  it("defaults unknown roles to advisor", () => {
    assert.equal(parsePromptRole("refine_gate"), "refine_gate");
    assert.equal(parsePromptRole("nope"), "advisor");
  });
});
