import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { DESK_NAV, isDeskPath } from "./nav";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("DESK_NAV", () => {
  it("has Home, Analyse a Stock, combined Subscription, and no Admin", () => {
    assert.equal(DESK_NAV.length, 7);
    assert.deepEqual(
      DESK_NAV.map((n) => n.label),
      [
        "Home",
        "Analyse a stock",
        "Review Portfolio",
        "Reports",
        "Elite Investors Holdings",
        "Subscription",
        "Contact us",
      ],
    );
    assert.equal(
      DESK_NAV.filter((n) => n.href === "/contact").length,
      1,
    );
    assert.equal(
      DESK_NAV.some((n) => /admin|handoff|usage|plans & wallet/i.test(n.label)),
      false,
    );
    assert.equal(
      DESK_NAV.filter((n) => n.href === "/billing").length,
      1,
    );
    assert.equal(DESK_NAV.find((n) => n.href === "/portfolio")?.href, "/portfolio");
    assert.equal(DESK_NAV.find((n) => n.href === "/portfolio")?.hint, "Your holdings");
    assert.equal(
      DESK_NAV.find((n) => n.href === "/reports")?.hint,
      "Saved notes",
    );
    assert.equal(
      DESK_NAV.find((n) => n.href === "/research/managers")?.href,
      "/research/managers",
    );
    assert.equal(
      DESK_NAV.find((n) => n.href === "/research/managers")?.hint,
      "What top investors hold",
    );
  });

  it("bolds tab names, keeps hints regular, and matches page titles", () => {
    const css = src("app/(desk)/desk.css");
    const portfolio = src("app/(desk)/portfolio/page.tsx");
    const managers = src("app/(desk)/research/managers/page.tsx");
    assert.match(css, /\.desk__nav-label \{[\s\S]*?font-weight: 700;/);
    assert.match(css, /\.desk__nav-hint \{[\s\S]*?font-weight: 400;/);
    assert.match(portfolio, /<h1 className="desk__h1">Review Portfolio<\/h1>/);
    assert.match(managers, /<h1 className="desk__h1">Elite Investors Holdings<\/h1>/);
    assert.equal(managers.includes('className="desk__kicker">Managers<'), false);
  });
});

describe("isDeskPath", () => {
  it("matches desk routes only", () => {
    assert.equal(isDeskPath("/desk"), true);
    assert.equal(isDeskPath("/analyse"), true);
    assert.equal(isDeskPath("/analyse/00000000-0000-4000-8000-000000000000"), true);
    assert.equal(isDeskPath("/research/managers"), true);
    assert.equal(isDeskPath("/settings/crash-letter"), true);
    assert.equal(isDeskPath("/usage"), true);
    assert.equal(isDeskPath("/subscription"), true);
    assert.equal(isDeskPath("/contact"), true);
    assert.equal(isDeskPath("/login"), false);
    assert.equal(isDeskPath("/admin/login"), false);
    assert.equal(isDeskPath("/"), false);
  });
});
