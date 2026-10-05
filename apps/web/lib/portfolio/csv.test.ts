import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PORTFOLIO_CSV_COLUMNS,
  PORTFOLIO_CSV_OPTIONAL_COLUMNS,
  csvTemplateHeader,
  csvTemplateText,
  csvTextFromFormData,
  detectCsvDelimiter,
  parsePortfolioCsv,
} from "./csv";

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
    assert.equal(parsed.rows[0].lot_kind, "retail");
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

  it("ignores # comment lines before the header and between rows", () => {
    const csv = `# note
ticker,company_name,cost_per_share,total_purchased,lot_kind
# skip this row
MSFT,Microsoft,400,4000,retail
# another
AAPL,Apple,100,1000,
`;
    const parsed = parsePortfolioCsv(csv, "auto");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0].ticker, "MSFT");
    assert.equal(parsed.rows[1].ticker, "AAPL");
    assert.equal(parsed.rows[1].lot_kind, "retail");
  });

  it("accepts spaced headers and semicolon files that still use the four columns", () => {
    const spaced = `Ticker,Company Name,Cost Per Share,Total Purchased
MSFT,Microsoft,400,4000
`;
    const parsed = parsePortfolioCsv(spaced, "auto");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.rows[0].accepted, true);
    assert.equal(parsed.rows[0].ticker, "MSFT");
    assert.equal(parsed.rows[0].qty, 10);

    const semi = `ticker;company_name;cost_per_share;total_purchased
AAA;Alpha;10;100
`;
    assert.equal(detectCsvDelimiter(semi.split("\n")[0]), ";");
    const semiParsed = parsePortfolioCsv(semi, "auto");
    assert.equal(semiParsed.ok, true);
    if (!semiParsed.ok) return;
    assert.equal(semiParsed.rows[0].ticker, "AAA");
    assert.equal(semiParsed.rows[0].qty, 10);
  });

  it("rejects a bad header without inventing columns", () => {
    const parsed = parsePortfolioCsv("foo,bar\n1,2\n");
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.match(parsed.error, /Missing: ticker, company_name, cost_per_share, total_purchased/);
  });

  it("template header includes the four required columns plus optional lot_kind", () => {
    const text = csvTemplateText();
    assert.equal(csvTemplateHeader(), `${PORTFOLIO_CSV_COLUMNS.join(",")},lot_kind`);
    assert.deepEqual([...PORTFOLIO_CSV_OPTIONAL_COLUMNS], ["lot_kind"]);
    assert.match(text, /# Required: ticker, company_name, cost_per_share, total_purchased/);
    assert.match(text, /# Optional: lot_kind \(lot_kind blank = retail\)/);
    assert.match(text, /Lines starting with # are ignored/);
    assert.match(text, new RegExp(`^${csvTemplateHeader()}$`, "m"));
    const parsed = parsePortfolioCsv(text, "auto");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0].accepted, true);
    assert.equal(parsed.rows[0].ticker, "MSFT");
    assert.equal(parsed.rows[0].lot_kind, "retail");
    assert.equal(parsed.rows[1].accepted, true);
    assert.equal(parsed.rows[1].ticker, "INFY");
    assert.equal(parsed.rows[1].lot_kind, "retail");
    assert.equal(parsed.rows[1].native_currency, "INR");
  });

  it("defaults missing or blank lot_kind to retail and rejects invalid kinds", () => {
    const missing = parsePortfolioCsv(
      `ticker,company_name,cost_per_share,total_purchased
MSFT,Microsoft,400,4000
`,
      "auto",
    );
    assert.equal(missing.ok, true);
    if (!missing.ok) return;
    assert.equal(missing.rows[0].accepted, true);
    assert.equal(missing.rows[0].lot_kind, "retail");

    const blank = parsePortfolioCsv(
      `ticker,company_name,cost_per_share,total_purchased,lot_kind
AAPL,Apple,100,1000,
`,
      "auto",
    );
    assert.equal(blank.ok, true);
    if (!blank.ok) return;
    assert.equal(blank.rows[0].accepted, true);
    assert.equal(blank.rows[0].lot_kind, "retail");

    const esop = parsePortfolioCsv(
      `ticker,company_name,cost_per_share,total_purchased,lot_kind
GOOG,Alphabet,150,1500,ESOP
`,
      "auto",
    );
    assert.equal(esop.ok, true);
    if (!esop.ok) return;
    assert.equal(esop.rows[0].accepted, true);
    assert.equal(esop.rows[0].lot_kind, "esop");

    const junk = parsePortfolioCsv(
      `ticker,company_name,cost_per_share,total_purchased,lot_kind
TSLA,Tesla,200,2000,pension
`,
      "auto",
    );
    assert.equal(junk.ok, true);
    if (!junk.ok) return;
    assert.equal(junk.rows[0].accepted, false);
    assert.match(junk.rows[0].reject_reason ?? "", /lot_kind/);
  });

  it("reads the File blob from the form, not a one-line hidden field", async () => {
    const fd = new FormData();
    fd.set(
      "file",
      new File(
        [`ticker,company_name,cost_per_share,total_purchased\nAAA,Alpha,10,100\n`],
        "lots.csv",
        { type: "text/csv" },
      ),
    );
    fd.set("csv", "ticker,company_name,cost_per_share,total_purchased");
    const text = await csvTextFromFormData(fd);
    assert.match(text, /AAA,Alpha,10,100/);
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
