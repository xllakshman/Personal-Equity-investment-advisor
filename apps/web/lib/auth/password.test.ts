import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { passwordLengthError, passwordTooShort } from "./password";

describe("passwordLengthError", () => {
  it("rejects empty", () => {
    assert.equal(passwordLengthError(""), "Enter a password.");
  });

  it("rejects 11 characters", () => {
    assert.equal(passwordTooShort("abcdefghijk"), true);
    assert.match(passwordLengthError("abcdefghijk") ?? "", /12/);
  });

  it("accepts 12 characters", () => {
    assert.equal(passwordTooShort("abcdefghijkl"), false);
    assert.equal(passwordLengthError("abcdefghijkl"), null);
  });
});
