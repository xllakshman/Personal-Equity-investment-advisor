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
    assert.match(actions, /display_currency: "USD"/);
    const add = src("components/features/portfolio/ManualAddForm.tsx");
    assert.match(add, /LotKindFields/);
    assert.match(add, /Viewers can read this book but cannot add lots/);
    assert.match(add, /htmlFor="manual-ticker"[\s\S]*?>\s*Ticker\s*</);
    assert.match(add, /htmlFor="manual-company"[\s\S]*?>\s*Company name\s*</);
    assert.match(add, /htmlFor="manual-cost"[\s\S]*?>\s*Cost \/ share\s*</);
    assert.match(add, /htmlFor="manual-total"[\s\S]*?>\s*Total purchased\s*</);
    assert.match(add, /htmlFor="manual-currency"[\s\S]*?>\s*Currency\s*</);
    assert.equal(add.includes('placeholder="Ticker"'), false);
    assert.match(card, /Required: ticker, company_name, cost_per_share, total_purchased/);
    assert.match(card, /Optional: lot_kind/);
  });
});
