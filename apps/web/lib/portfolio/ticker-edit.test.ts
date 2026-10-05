import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("ticker edit write gate", () => {
  it("owner and member can write; viewer cannot", () => {
    const session = src("lib/desk/session.ts");
    assert.match(
      session,
      /export function canWriteFamily[\s\S]*memberRole === "owner" \|\| session\.memberRole === "member"/,
    );
  });

  it("portfolio grid writes holding_lots and reads holdings; desk grid has no ticker write", () => {
    const page = src("app/(desk)/portfolio/page.tsx");
    const actions = src("app/(desk)/portfolio/actions.ts");
    const grid = src("components/features/portfolio/PortfolioHoldingsGrid.tsx");
    const deskGrid = src("components/features/desk/AllocationTable.tsx");
    const deskHome = src("components/features/desk/DeskHomeView.tsx");

    assert.match(page, /loadHoldingsGrid/);
    assert.match(page, /canWriteFamily\(session\)/);
    assert.match(page, /PortfolioHoldingsGrid/);
    assert.equal(page.includes("thesis_accept_analysis"), false);
    assert.equal(page.includes("AllocationTable"), false);

    assert.match(actions, /from\("holding_lots"\)/);
    assert.match(actions, /export async function updateHoldingTicker/);
    assert.match(actions, /export async function deleteHoldingTicker/);
    assert.equal(actions.includes("toDisplayAmount"), false);
    assert.match(actions, /missingLotKindColumn/);
    assert.match(actions, /writeWithOptionalLotKind/);
    const tickerFns = actions.slice(
      actions.indexOf("export async function updateHoldingTicker"),
    );
    assert.match(tickerFns, /if \(!canWriteFamily\(session\)\)/);
    assert.match(tickerFns, /VIEWER_WRITE_ERROR/);

    assert.match(grid, /showActions=\{canWrite\}/);
    assert.match(grid, /updateHoldingTicker/);
    assert.match(grid, /deleteHoldingTicker/);
    assert.match(grid, /Edit/);
    assert.match(grid, /Delete/);
    assert.match(grid, /Retail/);
    assert.match(grid, /ESOP/);
    assert.match(grid, /orig_lot_kind/);
    assert.match(grid, /LotKindFields/);
    assert.match(grid, /htmlFor="edit-ticker"[\s\S]*?>\s*Ticker\s*</);
    assert.match(grid, /htmlFor="edit-company"[\s\S]*?>\s*Company name\s*</);
    assert.match(grid, /htmlFor="edit-cost"[\s\S]*?>\s*Cost \/ share\s*</);
    assert.match(grid, /htmlFor="edit-total"[\s\S]*?>\s*Total purchased\s*</);
    assert.match(grid, /htmlFor="edit-currency"[\s\S]*?>\s*Currency\s*</);
    assert.match(grid, /name="total_purchased"/);
    assert.equal(grid.includes('name="qty"'), false);
    assert.match(grid, /defaultValue=\{editing\.ticker\}/);
    assert.match(grid, /totalPurchasedDisplay/);
    assert.match(grid, /defaultValue=\{String\(editing\.cost_per_share\)\}/);
    assert.match(grid, /defaultValue=\{editing\.native_currency\}/);

    assert.equal(deskGrid.includes("updateHoldingTicker"), false);
    assert.equal(deskGrid.includes("deleteHoldingTicker"), false);
    assert.equal(deskGrid.includes("Edit"), false);
    assert.match(deskHome, /AllocationTable/);
    assert.match(deskHome, /title="Retail"/);
    assert.match(deskHome, /title="ESOP"/);
    assert.equal(deskHome.includes("HomeBook"), false);
    assert.equal(deskHome.includes("Add stock"), false);
    assert.equal(deskHome.includes("Upload CSV"), false);
    assert.equal(deskHome.includes("useQuotes"), false);
    assert.match(deskHome, /All Reports/);
    assert.equal(deskHome.includes("PortfolioHoldingsGrid"), false);
  });
});
