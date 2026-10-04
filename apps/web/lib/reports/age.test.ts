import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  distinctCompanyOptions,
  distinctMonthOptions,
  distinctWeekOptions,
  inReportPeriod,
  isStaleNote,
  matchesCompany,
  monthKey,
  STALE_COPY,
  weekKey,
  weekLabel,
} from "./age";

describe("isStaleNote", () => {
  it("flags a note older than 60 days", () => {
    const now = new Date("2026-10-03T12:00:00Z");
    assert.equal(isStaleNote("2026-09-13T00:00:00Z", now), false);
    assert.equal(isStaleNote("2026-07-01T00:00:00Z", now), true);
    assert.match(STALE_COPY, /60 days/);
  });
});

describe("inReportPeriod", () => {
  it("keeps this week and this calendar month", () => {
    const now = new Date("2026-10-03T12:00:00Z");
    assert.equal(inReportPeriod("2026-10-01T00:00:00Z", "week", now), true);
    assert.equal(inReportPeriod("2026-09-20T00:00:00Z", "week", now), false);
    assert.equal(inReportPeriod("2026-10-01T00:00:00Z", "month", now), true);
    assert.equal(inReportPeriod("2026-09-13T00:00:00Z", "month", now), false);
    assert.equal(inReportPeriod("2026-01-01T00:00:00Z", "all", now), true);
  });
});

describe("matchesCompany", () => {
  it("matches ticker or note name", () => {
    const row = { ticker: "MSFT", name: "MSFT — accumulate on weakness" };
    assert.equal(matchesCompany(row, ""), true);
    assert.equal(matchesCompany(row, "msft"), true);
    assert.equal(matchesCompany(row, "GOOG"), false);
    assert.equal(matchesCompany(row, "accumulate"), true);
  });

  it("monthKey is YYYY-MM", () => {
    assert.equal(monthKey("2026-09-13T10:00:00Z"), "2026-09");
  });
});

describe("report filter options", () => {
  it("lists distinct companies, months, and unique week labels by ISO key", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    const companies = distinctCompanyOptions([
      { ticker: "MSFT", name: "MSFT — accumulate on weakness" },
      { ticker: "msft", name: "MSFT follow-up" },
      { ticker: "AAPL", name: "AAPL — hold" },
      { ticker: "", name: "" },
    ]);
    assert.deepEqual(
      companies.map((c) => c.value),
      ["AAPL", "MSFT"],
    );
    const months = distinctMonthOptions([
      "2026-10-01T00:00:00Z",
      "2026-10-12T00:00:00Z",
      "2026-09-13T00:00:00Z",
    ]);
    assert.deepEqual(
      months.map((m) => m.value),
      ["2026-10", "2026-09"],
    );
    const weeks = distinctWeekOptions(
      [
        "2026-10-05T10:00:00Z",
        "2026-10-06T10:00:00Z",
        "2026-09-29T10:00:00Z",
        "2025-10-06T10:00:00Z",
      ],
      now,
    );
    const keys = weeks.map((w) => w.value);
    assert.equal(new Set(keys).size, keys.length);
    const labels = weeks.map((w) => w.label);
    assert.equal(new Set(labels).size, labels.length);
    assert.equal(labels.includes("This week"), false);
    assert.equal(weekKey("2026-10-05T10:00:00Z"), "2026-10-05");
    assert.match(weekLabel("2026-10-05T10:00:00Z", now), /2026/);
    assert.match(weekLabel("2025-10-06T10:00:00Z", now), /2025/);
  });
});
