import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

function walk(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

describe("analyse server actions", () => {
  it("does not export objects from use-server files (Next treats that as a page crash)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const webRoot = join(here, "../..");
    const hits: string[] = [];
    for (const file of walk(webRoot)) {
      const body = readFileSync(file, "utf8");
      if (!body.startsWith('"use server"') && !body.startsWith("'use server'")) {
        continue;
      }
      if (/^export const /m.test(body) || /^export type /m.test(body)) {
        hits.push(relative(webRoot, file));
      }
    }
    assert.deepEqual(hits, []);
  });
});
