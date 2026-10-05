import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Home book and notes widget", () => {
  it("reads view holdings, not a second lots book; sleeves and P&L are display-only", () => {
    const page = src("app/(desk)/desk/page.tsx");
    const home = src("lib/desk/load-home.ts");
    const view = src("components/features/desk/DeskHomeView.tsx");
    const alloc = src("components/features/desk/AllocationTable.tsx");
    assert.match(page, /loadDeskHome/);
    assert.equal(page.includes("loadHoldingLots"), false);
    assert.match(home, /selectHoldingsRows/);
    assert.match(home, /loadPortfolioTrend/);
    assert.match(home, /loadHoldingQuotes/);
    assert.equal(home.includes('from("holding_lots")'), false);
    assert.equal(home.includes(".insert("), false);
    assert.match(home, /sumDisplayCost\(holdings, displayCurrency, fxUsdInr\)/);
    assert.match(home, /asDisplayCurrency/);
    assert.match(view, /title="Retail"/);
    assert.match(view, /title="ESOP"/);
    assert.match(view, /PortfolioTrendCard trend=\{home\.trend\}/);
    assert.match(view, /formatPnlPct\(home\.unrealizedPnlPct\)/);
    assert.equal(view.includes("Add stock"), false);
    assert.equal(view.includes("HomeBook"), false);
    assert.equal(alloc.includes("useQuotes"), false);
    assert.equal(view.includes("useQuotes"), false);
    assert.match(view, /home\.displayCostBasis/);
    assert.match(view, /home\.displayCurrency/);
    assert.equal(view.includes("home.costCurrency"), false);
  });

  it("shows only the latest own report and links All Reports to /reports", () => {
    const home = src("lib/desk/load-home.ts");
    const view = src("components/features/desk/DeskHomeView.tsx");
    assert.match(home, /ownReports\.slice\(0, 1\)/);
    assert.match(home, /is_library_sample/);
    assert.match(home, /savedNotesCount: ownReports\.length/);
    assert.match(view, /href="\/reports"/);
    assert.match(view, /All Reports/);
    assert.match(view, /home\.recentNotes/);
  });
});
