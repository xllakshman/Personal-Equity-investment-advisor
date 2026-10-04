import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("auth glossary copy", () => {
  it("says fall and return goal instead of drawdown or CAGR", () => {
    const shell = src("components/features/auth/AuthShell.tsx");
    assert.match(shell, /how big a fall you can sit through/);
    assert.match(shell, /return goal/);
    assert.equal(shell.includes("drawdown"), false);
    assert.equal(shell.includes("CAGR"), false);
  });
});
