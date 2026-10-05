import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("CSV import UI", () => {
  it("submits the File blob, offers the four-column template, and hides upload for viewers", () => {
    const card = src("components/features/portfolio/CsvImportCard.tsx");
    const page = src("app/(desk)/portfolio/page.tsx");
    const actions = src("app/(desk)/portfolio/actions.ts");
    assert.match(page, /CsvImportCard canWrite=\{canWriteFamily\(session\)\}/);
    assert.match(card, /name="file"/);
    assert.match(card, /Download CSV template/);
    assert.match(card, /csvTemplateText/);
    assert.match(card, /Viewers can read this book but cannot upload a CSV/);
    assert.match(card, /onDrop/);
    assert.equal(card.includes('name="csv"'), false);
    assert.match(actions, /csvTextFromFormData/);
    assert.match(actions, /from\("holding_lots"\)\.insert/);
    assert.match(actions, /writeWithOptionalLotKind/);
    assert.match(actions, /missingLotKindColumn/);
    assert.equal(actions.includes("toDisplayAmount"), false);
    const add = src("components/features/portfolio/ManualAddForm.tsx");
    assert.match(add, /LotKindFields/);
    assert.match(add, /Viewers can read this book but cannot add lots/);
  });
});
