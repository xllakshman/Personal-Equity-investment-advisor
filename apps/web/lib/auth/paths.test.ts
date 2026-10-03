import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MARKETING_HOME, unsignedVisitorHref } from "./paths";

describe("unsignedVisitorHref", () => {
  it("sends signed-out visitors to marketing home, not /login", () => {
    assert.equal(MARKETING_HOME, "/");
    assert.equal(unsignedVisitorHref(), "/");
    assert.notEqual(unsignedVisitorHref(), "/login");
    assert.notEqual(unsignedVisitorHref(), "/desk");
  });
});
