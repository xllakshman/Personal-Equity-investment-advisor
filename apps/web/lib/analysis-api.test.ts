import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PROD_ANALYSIS_API_URL, analysisApiBase } from "./analysis-api";

describe("analysisApiBase", () => {
  it("uses ANALYSIS_API_URL when set, including on Vercel", () => {
    assert.equal(
      analysisApiBase({
        ANALYSIS_API_URL: "https://api.eqveste.com/",
        VERCEL: "1",
      } as unknown as NodeJS.ProcessEnv),
      PROD_ANALYSIS_API_URL,
    );
  });

  it("uses localhost for local Next when no URL is set", () => {
    assert.equal(
      analysisApiBase({} as unknown as NodeJS.ProcessEnv),
      "http://127.0.0.1:8091",
    );
  });

  it("defaults Vercel to the droplet hostname so Fetch does not hit 127.0.0.1", () => {
    assert.equal(
      analysisApiBase({ VERCEL: "1" } as unknown as NodeJS.ProcessEnv),
      PROD_ANALYSIS_API_URL,
    );
  });

  it("prefers an explicit URL over the Vercel default", () => {
    assert.equal(
      analysisApiBase({
        VERCEL: "1",
        THESIS_ANALYSIS_API: "https://api.example.test",
      } as unknown as NodeJS.ProcessEnv),
      "https://api.example.test",
    );
  });
});
