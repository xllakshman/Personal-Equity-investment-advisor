import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ELITE_INVESTORS } from "./elite-catalog";
import { annualized, periodReturns, parseMonthlyCloses, pctLabel, totalReturn } from "./cagr";
import {
  latest13F,
  parseInfoTableXml,
  parseReportQuarter,
  pickHoldingsXml,
  rollupHoldings,
} from "./sec-13f";
import { emptySnapshot } from "./elite-types";

describe("elite catalog", () => {
  it("lists all twenty named investors", () => {
    assert.equal(ELITE_INVESTORS.length, 20);
    assert.equal(ELITE_INVESTORS[0]?.name, "Warren Buffett");
    assert.equal(ELITE_INVESTORS[19]?.name, "Julian Robertson");
    assert.equal(new Set(ELITE_INVESTORS.map((r) => r.slug)).size, 20);
  });
});

describe("parseInfoTableXml", () => {
  it("rolls up duplicate CUSIPs and weights the book", () => {
    const xml = `
      <informationTable>
        <infoTable>
          <nameOfIssuer>APPLE INC</nameOfIssuer>
          <titleOfClass>COM</titleOfClass>
          <cusip>037833100</cusip>
          <value>200</value>
          <sshPrnamt>10</sshPrnamt>
        </infoTable>
        <infoTable>
          <nameOfIssuer>APPLE INC</nameOfIssuer>
          <titleOfClass>COM</titleOfClass>
          <cusip>037833100</cusip>
          <value>50</value>
          <sshPrnamt>2</sshPrnamt>
        </infoTable>
        <infoTable>
          <nameOfIssuer>COCA COLA CO</nameOfIssuer>
          <titleOfClass>COM</titleOfClass>
          <cusip>191216100</cusip>
          <value>50</value>
          <sshPrnamt>5</sshPrnamt>
        </infoTable>
      </informationTable>`;
    const rows = rollupHoldings(parseInfoTableXml(xml));
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.issuer, "APPLE INC");
    assert.equal(rows[0]?.ticker, null);
    assert.equal(rows[0]?.valueUsd, 250);
    assert.equal(rows[0]?.shares, 12);
    assert.ok(Math.abs((rows[0]?.weightPct ?? 0) - 250 / 300 * 100) < 1e-9);
    assert.ok(Math.abs((rows[1]?.weightPct ?? 0) - 50 / 300 * 100) < 1e-9);
  });

  it("returns empty on junk", () => {
    assert.deepEqual(parseInfoTableXml(""), []);
    assert.deepEqual(parseInfoTableXml("<doc/>"), []);
  });
});

describe("latest13F", () => {
  it("picks the first 13F-HR and skips other forms", () => {
    const hit = latest13F({
      form: ["10-K", "13F-HR", "13F-HR/A"],
      accessionNumber: ["a", "0001193125-26-352200", "c"],
      primaryDocument: ["x", "xslForm13F_X02/primary_doc.xml", "z"],
    });
    assert.equal(hit?.accession, "0001193125-26-352200");
    assert.equal(hit?.accessionNodash, "000119312526352200");
  });

  it("returns null when none", () => {
    assert.equal(latest13F({ form: ["10-K"], accessionNumber: ["a"], primaryDocument: ["x"] }), null);
    assert.equal(latest13F(null), null);
  });
});

describe("pickHoldingsXml + quarter", () => {
  it("skips primary_doc for the information table", () => {
    assert.equal(
      pickHoldingsXml([
        { name: "primary_doc.xml" },
        { name: "56757.xml" },
        { name: "index.html" },
      ]),
      "56757.xml",
    );
    assert.equal(parseReportQuarter("<reportCalendarOrQuarter>06-30-2026</reportCalendarOrQuarter>"), "2026-06-30");
  });
});

describe("periodReturns", () => {
  it("computes 1y total return from monthly closes", () => {
    const start = 1_700_000_000;
    const payload = {
      chart: {
        result: [
          {
            timestamp: [start, start + 365.25 * 24 * 3600],
            indicators: { quote: [{ close: [100, 121] }] },
          },
        ],
      },
    };
    const pts = parseMonthlyCloses(payload);
    const r = periodReturns(pts);
    assert.ok(Math.abs((r.y1 ?? 0) - 0.21) < 1e-9);
    assert.equal(r.y3, null);
    assert.equal(pctLabel(0.21), "+21.0%");
    assert.equal(annualized(133.1, 100, 3)?.toFixed(4), "0.1000");
    assert.equal(pctLabel(null), "—");
    assert.equal(totalReturn(0, 1), null);
  });

  it("returns empty on junk chart", () => {
    assert.deepEqual(parseMonthlyCloses({}), []);
    const r = periodReturns([]);
    assert.equal(r.y1, null);
  });
});

describe("emptySnapshot", () => {
  it("does not fetch and keeps twenty empty books", () => {
    const snap = emptySnapshot();
    assert.equal(snap.investors.length, 20);
    assert.equal(snap.generatedAt, null);
    assert.equal(snap.investors[0]?.holdings.length, 0);
  });
});
