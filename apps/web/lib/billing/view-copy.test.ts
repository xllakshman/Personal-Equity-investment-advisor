import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("billing subscription copy", () => {
  it("labels the current plan and keeps checkout as Choose, with the intent callout", () => {
    const view = src("components/features/billing/BillingView.tsx");
    const page = src("app/(desk)/billing/page.tsx");
    assert.match(view, />Your plan</);
    assert.match(view, /"Requested" : "Choose"/);
    assert.equal(view.includes("Current plan"), false);
    assert.match(view, /requestCheckout/);
    assert.match(view, /UPI_VPA/);
    assert.match(page, /Choose saves a payment request/);
    assert.match(page, /not a next-month switch/);
    assert.match(page, /Admin → Accounts Activate/);
  });
});
