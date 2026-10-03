import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deskPrivacyView } from "./privacy-status";

describe("deskPrivacyView", () => {
  it("labels an off grant as Private", () => {
    const view = deskPrivacyView({ active: false, expiresAt: null });
    assert.equal(view.shared, false);
    assert.equal(view.badge, "Private");
    assert.equal(view.title, "Your account view is private");
  });

  it("labels an unexpired grant as Shared with admin", () => {
    const view = deskPrivacyView({
      active: true,
      expiresAt: "2026-10-10T12:00:00.000Z",
    });
    assert.equal(view.shared, true);
    assert.equal(view.badge, "Shared with admin");
    assert.match(view.detail, /10 Oct 2026/);
  });
});
