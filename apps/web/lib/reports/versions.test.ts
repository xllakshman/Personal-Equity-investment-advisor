import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assignNoteVersions, versionLabel } from "./versions";

describe("assignNoteVersions", () => {
  it("numbers oldest first for the same ticker", () => {
    const rows = assignNoteVersions([
      { ticker: "MSFT", kind: "note", lastRun: "2026-09-20T00:00:00Z", id: "b" },
      { ticker: "MSFT", kind: "note", lastRun: "2026-09-13T00:00:00Z", id: "a" },
      { ticker: "DEMO", kind: "note", lastRun: "2026-09-13T00:00:00Z", id: "d" },
      { ticker: "MSFT", kind: "in_progress", lastRun: "2026-10-03T00:00:00Z", id: "q" },
    ]);
    const msft = rows.filter((r) => r.ticker === "MSFT" && r.kind === "note");
    assert.equal(msft.find((r) => r.id === "a")?.version, 1);
    assert.equal(msft.find((r) => r.id === "b")?.version, 2);
    assert.equal(msft.find((r) => r.id === "b")?.versionCount, 2);
    assert.equal(rows.find((r) => r.id === "q")?.version, null);
    assert.equal(versionLabel(2, 2), "v2 of 2");
    assert.equal(versionLabel(1, 1), "v1");
    assert.equal(versionLabel(null, 0), "—");
  });

  it("handles empty", () => {
    assert.deepEqual(assignNoteVersions([]), []);
  });
});
