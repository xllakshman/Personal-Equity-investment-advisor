import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("AccountMenu", () => {
  it("opens a Profile / Sign out menu from the name, with no initials disc", () => {
    const menu = src("components/features/desk/AccountMenu.tsx");
    const signOut = src("components/features/desk/SignOutButton.tsx");
    const shell = src("components/features/desk/AppShell.tsx");

    assert.equal(menu.includes("desk__avatar"), false);
    assert.equal(menu.includes("initials("), false);
    assert.equal(menu.includes('from "@/lib/desk/identity"'), false);
    assert.match(menu, /href="\/settings\/profile"/);
    assert.match(menu, /<SignOutButton\s*\/>/);
    assert.match(menu, /aria-expanded=\{open\}/);
    assert.match(menu, /aria-haspopup="menu"/);
    assert.match(menu, /Escape/);
    assert.match(menu, /usePathname/);
    const css = src("app/(desk)/desk.css");
    assert.match(css, /desk-glass-in/);
    assert.match(css, /backdrop-filter: blur\(28px\)/);
    assert.match(css, /--desk-paper: #fafafa/);
    assert.match(css, /--desk-ink: #1d1d1f/);

    assert.match(signOut, /from "@\/app\/\(auth\)\/actions"/);
    assert.match(signOut, /await signOut\(\)/);
    assert.match(signOut, /unsignedVisitorHref\(\)/);

    assert.match(shell, /<CurrencyChip currency=\{displayCurrency\} \/>/);
    assert.match(shell, /<AccountMenu fullName=\{session\.fullName\} planLine=\{planChip\} \/>/);
    assert.equal(shell.includes("desk__avatar"), false);
    assert.equal(shell.includes("<SignOutButton"), false);
  });
});
