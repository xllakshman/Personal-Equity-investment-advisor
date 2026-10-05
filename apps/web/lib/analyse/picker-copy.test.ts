import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("agent picker copy", () => {
  it("hides dollar amounts and shows credits", () => {
    const picker = src("components/features/builder/AgentPicker.tsx");
    const wizard = src("components/features/builder/AnalyseWizard.tsx");
    assert.equal(picker.includes("modelCost"), false);
    assert.equal(picker.includes("$"), false);
    assert.match(picker, /agentCreditLabel/);
    assert.match(picker, /1\.5 credits/);
    assert.match(picker, /1 credit/);
    assert.equal(wizard.includes("modelCost("), false);
    assert.match(wizard, /agentCreditLabel/);
    assert.match(wizard, /does not run Frontier/);
  });
});
