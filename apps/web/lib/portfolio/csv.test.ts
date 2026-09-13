import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parsePortfolioCsv } from "./csv";

const FIVE = `ticker,company_name,cost_per_share,total_purchased
AAA,Alpha,10,100
BBB,Beta,20,200
CCC,Gamma,5,50
DDD,Delta,8,80
EEE,Epsilon,12,120
`;

describe("parsePortfolioCsv", () => {
  it("accepts a 5-row valid file and derives qty without FX", () => {
    const parsed = parsePortfolioCsv(FIVE, "auto");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.rows.length, 5);
    assert.equal(parsed.rows.every((r) => r.accepted), true);
    assert.equal(parsed.rows[0].qty, 10);
    assert.equal(parsed.rows[0].cost_per_share, 10);
    assert.equal(parsed.rows[0].native_currency, "USD");
  });

  it("rejects a blank ticker and still lists the row", () => {
    const csv = `ticker,company_name,cost_per_share,total_purchased
,Blank Co,10,100
MSFT,Microsoft,400,4000
`;
    const parsed = parsePortfolioCsv(csv, "auto");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.rows[0].accepted, false);
    assert.equal(parsed.rows[0].reject_reason, "Blank ticker");
    assert.equal(parsed.rows[0].ticker, null);
    assert.equal(parsed.rows[1].accepted, true);
    assert.equal(parsed.rows[1].ticker, "MSFT");
  });

  it("guesses INR for NSE suffix unless overridden", () => {
    const csv = `ticker,company_name,cost_per_share,total_purchased
HDFCBANK.NS,HDFC Bank,1500,150000
`;
    const auto = parsePortfolioCsv(csv, "auto");
    assert.equal(auto.ok, true);
    if (!auto.ok) return;
    assert.equal(auto.rows[0].ticker, "HDFCBANK");
    assert.equal(auto.rows[0].exchange, "NSE");
    assert.equal(auto.rows[0].native_currency, "INR");
    assert.equal(auto.rows[0].cost_per_share, 1500);

    const usd = parsePortfolioCsv(csv, "USD");
    assert.equal(usd.ok, true);
    if (!usd.ok) return;
    assert.equal(usd.rows[0].native_currency, "USD");
    assert.equal(usd.rows[0].cost_per_share, 1500);
  });

  it("rejects empty input", () => {
    const parsed = parsePortfolioCsv("   ");
    assert.equal(parsed.ok, false);
  });

  it("rejects cost 0", () => {
    const csv = `ticker,company_name,cost_per_share,total_purchased
MSFT,Microsoft,0,100
`;
    const parsed = parsePortfolioCsv(csv, "auto");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.rows[0].accepted, false);
  });
});
