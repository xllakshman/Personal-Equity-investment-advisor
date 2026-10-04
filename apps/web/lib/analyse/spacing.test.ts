import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("analyse steps 3–5 spacing", () => {
  it("puts labels above taller fields on position, risk, and tax only", () => {
    const css = src("app/(desk)/desk.css");
    const wizard = src("components/features/builder/AnalyseWizard.tsx");

    assert.match(css, /#analyse-step-3 \.pf__label/);
    assert.match(css, /flex-direction:\s*column/);
    assert.match(css, /minmax\(260px,\s*1fr\)/);
    assert.match(css, /min-height:\s*46px/);
    assert.match(css, /#analyse-step-4 select\.pf__input/);
    assert.match(css, /#analyse-step-5 select\.pf__input/);
    assert.match(wizard, /id="analyse-step-3"/);
    assert.match(wizard, /<span>Quantity<\/span>/);
    assert.match(wizard, /<span>Risk appetite/);
    assert.match(wizard, /<span>Residency for tax<\/span>/);
  });
});
