import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GOOGLE_NOT_ENABLED, googleSignInBanner } from "./google-error";

describe("googleSignInBanner", () => {
  it("uses locked copy for empty", () => {
    assert.equal(googleSignInBanner(null), GOOGLE_NOT_ENABLED);
    assert.equal(googleSignInBanner(""), GOOGLE_NOT_ENABLED);
  });

  it("maps provider-disabled errors", () => {
    assert.equal(
      googleSignInBanner("Unsupported provider: provider is not enabled"),
      GOOGLE_NOT_ENABLED,
    );
    assert.equal(googleSignInBanner("validation_failed"), GOOGLE_NOT_ENABLED);
  });

  it("does not swallow an unexpected message into a blank banner", () => {
    assert.equal(googleSignInBanner("network down"), "network down");
  });
});
