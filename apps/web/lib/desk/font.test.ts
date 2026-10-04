import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("desk typeface", () => {
  it("desk shell loads Carlito and prefers Calibri; marketing and login do not", () => {
    const font = src("lib/desk/font.ts");
    const deskCss = src("app/(desk)/desk.css");
    const shell = src("components/features/desk/AppShell.tsx");
    const admin = src("app/admin/(console)/layout.tsx");
    const marketing = src("app/(marketing)/marketing.css");
    const auth = src("app/(auth)/auth.css");

    assert.match(font, /DESK_FONT_STACK = "Calibri, Carlito, sans-serif"/);
    assert.match(font, /from "next\/font\/google"/);
    assert.match(font, /Carlito\(/);
    assert.equal(font.includes("Inter"), false);
    assert.match(
      deskCss,
      /font-family:\s*Calibri,\s*var\(--font-carlito\),\s*Carlito,\s*sans-serif/,
    );
    assert.match(shell, /deskFont\.variable/);
    assert.match(admin, /deskFont\.variable/);
    assert.match(marketing, /Helvetica Neue/);
    assert.match(auth, /Helvetica Neue/);
    assert.equal(marketing.includes("Calibri"), false);
    assert.equal(auth.includes("Calibri"), false);
    assert.equal(marketing.includes("Carlito"), false);
    assert.equal(auth.includes("Carlito"), false);
  });
});
