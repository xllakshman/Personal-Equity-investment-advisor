import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { DESK_FONT_STACK } from "./font";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("desk typeface", () => {
  it("desk shell uses the App.dc.html SF Pro stack; marketing and login stay Helvetica", () => {
    const font = src("lib/desk/font.ts");
    const deskCss = src("app/(desk)/desk.css");
    const shell = src("components/features/desk/AppShell.tsx");
    const admin = src("app/admin/(console)/layout.tsx");
    const marketing = src("app/(marketing)/marketing.css");
    const auth = src("app/(auth)/auth.css");

    assert.match(DESK_FONT_STACK, /SF Pro Display/);
    assert.match(DESK_FONT_STACK, /Helvetica Neue/);
    assert.equal(font.includes("IBM_Plex_Sans"), false);
    assert.equal(font.includes("next/font/google"), false);
    assert.equal(font.includes("Calibri"), false);
    assert.equal(font.includes("Carlito"), false);
    assert.equal(font.includes("Inter"), false);
    assert.match(
      deskCss,
      /font-family:\s*-apple-system,\s*"SF Pro Display",\s*"SF Pro Text",\s*"Helvetica Neue",\s*Helvetica,\s*sans-serif/,
    );
    assert.equal(deskCss.includes("IBM Plex Sans"), false);
    assert.equal(deskCss.includes("Newsreader"), false);
    assert.equal(deskCss.includes("Calibri"), false);
    assert.equal(deskCss.includes("Carlito"), false);
    assert.equal(shell.includes("deskFont"), false);
    assert.equal(admin.includes("deskFont"), false);
    assert.match(marketing, /Helvetica Neue/);
    assert.match(auth, /Helvetica Neue/);
    assert.equal(auth.includes("IBM Plex"), false);
    assert.equal(auth.includes("Newsreader"), false);
    assert.equal(marketing.includes("Calibri"), false);
    assert.equal(auth.includes("Calibri"), false);
    assert.equal(marketing.includes("Carlito"), false);
    assert.equal(auth.includes("Carlito"), false);
  });
});
