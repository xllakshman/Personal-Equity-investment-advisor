import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  chipLabel,
  eliteAccent,
  normalizeTicker,
  overlapCopy,
  topHoldingChips,
  uniqueHeldTickers,
} from "./holding-chips";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("holding chips overlap", () => {
  it("normalizes blank and mixed-case tickers", () => {
    assert.equal(normalizeTicker(null), "");
    assert.equal(normalizeTicker("  aapl "), "AAPL");
    assert.deepEqual(uniqueHeldTickers(["aapl", "AAPL", "", " ko "]), ["AAPL", "KO"]);
    assert.deepEqual(uniqueHeldTickers([]), []);
  });

  it("takes the top five and highlights overlap with the user's holdings", () => {
    const chips = topHoldingChips(
      [
        { ticker: "aapl", issuer: "Apple" },
        { ticker: "BAC", issuer: "Bank of America" },
        { ticker: null, issuer: "Some long private issuer name" },
        { ticker: "KO", issuer: "Coca-Cola" },
        { ticker: "CVX", issuer: "Chevron" },
        { ticker: "AXP", issuer: "Amex" },
      ],
      ["AAPL", "ko"],
    );
    assert.equal(chips.length, 5);
    assert.deepEqual(
      chips.map((c) => c.label),
      ["AAPL", "BAC", "Some long privat…", "KO", "CVX"],
    );
    assert.equal(chips[0]?.overlap, true);
    assert.equal(chips[1]?.overlap, false);
    assert.equal(chips[2]?.overlap, false);
    assert.equal(chips[3]?.overlap, true);
    assert.equal(overlapCopy(chips), "You both own AAPL, KO");
  });

  it("uses empty overlap copy and a dash label when nothing matches", () => {
    assert.equal(chipLabel({ ticker: null, issuer: "" }), "—");
    assert.equal(overlapCopy([]), "No overlap with your holdings yet");
    assert.equal(
      overlapCopy(topHoldingChips([{ ticker: "MSFT", issuer: "Microsoft" }], [])),
      "No overlap with your holdings yet",
    );
  });

  it("cycles chip accents", () => {
    assert.equal(eliteAccent(0), "#0a84ff");
    assert.equal(eliteAccent(5), "#0a84ff");
  });
});

describe("managers desk copy", () => {
  it("keeps all twenty investors, reads holdings, and still refreshes via the API", () => {
    const page = src("app/(desk)/research/managers/page.tsx");
    const desk = src("components/features/research/EliteInvestorDesk.tsx");
    assert.match(page, /className="desk__kicker">Managers</);
    assert.match(page, /<h1 className="desk__h1">What they hold<\/h1>/);
    assert.match(page, /\.from\("holdings"\)/);
    assert.match(page, /heldTickers=\{heldTickers\}/);
    assert.match(desk, /ELITE_INVESTORS\.map/);
    assert.match(desk, /topHoldingChips/);
    assert.match(desk, /\/api\/elite-investors\/refresh/);
  });
});
