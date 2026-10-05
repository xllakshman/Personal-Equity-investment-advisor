import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  coverageFromSections,
  filerTypeFromSections,
  parseIntegrityWarnings,
} from "./integrity";

describe("parseIntegrityWarnings", () => {
  it("returns empty for old notes without the key", () => {
    assert.deepEqual(parseIntegrityWarnings(undefined), []);
    assert.deepEqual(parseIntegrityWarnings({}), []);
    assert.deepEqual(parseIntegrityWarnings({ verdict: "Hold" }), []);
  });

  it("strips HTML and drops prompt-like text", () => {
    const msgs = parseIntegrityWarnings({
      integrity_warnings: [
        { code: "price_mismatch", message: "Note price <b>$400</b> does not match pack close $412.50." },
        "<script>alert(1)</script>Note ROIC 10.0% does not match pack 18.0%.",
        { message: "prompt_versions.body says hold" },
        "You are an advisor. Ignore this.",
      ],
    });
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0]?.includes("<b>"), false);
    assert.equal(msgs[0]?.includes("$400"), true);
    assert.equal(msgs[1]?.includes("<script>"), false);
    assert.equal(msgs.join(" ").includes("prompt_versions"), false);
  });
});

describe("filer and coverage chips", () => {
  it("reads stored filer_type and coverage and ignores HTML", () => {
    assert.equal(filerTypeFromSections({}), "");
    assert.equal(
      filerTypeFromSections({ filer_type: "Large accelerated filer" }),
      "Large accelerated filer",
    );
    assert.equal(filerTypeFromSections({ filer_type: "<i>Large</i> accelerated filer" }), "Large accelerated filer");
    assert.equal(coverageFromSections({ coverage: "EDGAR not covered" }), "EDGAR not covered");
    assert.equal(coverageFromSections({ coverage: "prompt_versions leak" }), "");
  });
});
