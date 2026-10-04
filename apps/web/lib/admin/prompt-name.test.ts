import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canRemovePrompt,
  formatPromptDate,
  parsePromptRole,
  promptInUseLine,
  promptNameSuffix,
  promptRemoveError,
  promptRoleLabel,
  promptRoleOutcome,
  promptVersionName,
} from "./prompt-name";

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

describe("prompt list copy", () => {
  it("maps roles to what Analyse uses, not slugs", () => {
    assert.equal(promptRoleLabel("advisor"), "Stock notes");
    assert.equal(promptRoleLabel("refine_gate"), "Follow-up check");
    assert.equal(promptRoleLabel("weekly_digest"), "Weekly email");
    assert.equal(promptRoleLabel("nope"), "Stock notes");
    assert.match(promptRoleOutcome("advisor"), /Submit/);
  });

  it("formats in-use since in IST without a UTC dump", () => {
    assert.equal(formatPromptDate("2026-10-03T20:00:00Z"), "4 Oct 2026");
    assert.equal(
      promptInUseLine("advisor", "2026-10-03T20:00:00Z"),
      "Stock notes — in use since 4 Oct 2026",
    );
    assert.equal(promptInUseLine("refine_gate", null), "Follow-up check — in use");
    assert.equal(formatPromptDate(""), "");
    assert.equal(formatPromptDate("not-a-date"), "");
  });

  it("refuses Remove on the live row and on already-removed rows", () => {
    assert.equal(
      canRemovePrompt({ promoted_at: "2026-10-04T00:00:00Z", superseded_at: null }),
      false,
    );
    assert.equal(
      canRemovePrompt({
        promoted_at: "2026-09-14T00:00:00Z",
        superseded_at: "2026-10-04T00:00:00Z",
      }),
      true,
    );
    assert.equal(
      canRemovePrompt({ promoted_at: null, superseded_at: null }),
      true,
    );
    assert.equal(
      canRemovePrompt({
        promoted_at: null,
        superseded_at: null,
        archived_at: "2026-10-04T00:00:00Z",
      }),
      false,
    );
  });

  it("maps Remove RPC errors to operator copy", () => {
    assert.equal(
      promptRemoveError("THS-PROMPT-001 This is the prompt Analyse is using. Promote another version first."),
      "This is the prompt Analyse is using. Promote another version first.",
    );
    assert.equal(
      promptRemoveError(
        "Could not find the function public.thesis_admin_remove_prompt(p_id) in the schema cache",
      ),
      "Apply migration 026 so Remove can hide old prompts.",
    );
    assert.equal(promptRemoveError("network down"), "network down");
  });
});
