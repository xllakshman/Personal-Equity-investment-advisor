import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseLotId, parseLotEdit, parseLotKey, parseLotWrite } from "./lot-write";

function form(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe("parseLotWrite", () => {
  it("derives qty from total / cost and uppercases ticker", () => {
    const got = parseLotWrite(
      form({
        ticker: "msft",
        company_name: "Microsoft",
        cost_per_share: "402.5",
        total_purchased: "11270",
        currency: "USD",
      }),
    );
    assert.equal(got.ok, true);
    if (got.ok) {
      assert.equal(got.value.ticker, "MSFT");
      assert.equal(got.value.qty, 28);
      assert.equal(got.value.native, "USD");
    }
  });

  it("rejects empty ticker, zero cost, and empty total", () => {
    const blank = parseLotWrite(
      form({ ticker: "  ", cost_per_share: "10", total_purchased: "100" }),
    );
    assert.equal(blank.ok, false);
    if (!blank.ok) assert.match(blank.error, /ticker/i);
    const zero = parseLotWrite(
      form({ ticker: "MSFT", cost_per_share: "0", total_purchased: "100" }),
    );
    assert.equal(zero.ok, false);
    const empty = parseLotWrite(
      form({ ticker: "MSFT", cost_per_share: "10", total_purchased: "" }),
    );
    assert.equal(empty.ok, false);
  });
});

describe("parseLotEdit", () => {
  it("keeps typed qty and cost without FX", () => {
    const got = parseLotEdit(
      form({
        ticker: "msft",
        company_name: "Microsoft",
        qty: "30",
        cost_per_share: "403",
        currency: "USD",
      }),
    );
    assert.equal(got.ok, true);
    if (got.ok) {
      assert.equal(got.value.ticker, "MSFT");
      assert.equal(got.value.qty, 30);
      assert.equal(got.value.cost, 403);
      assert.equal(got.value.company, "Microsoft");
    }
  });

  it("rejects empty ticker, zero qty, empty qty, and zero cost", () => {
    const blank = parseLotEdit(
      form({ ticker: "  ", qty: "10", cost_per_share: "10" }),
    );
    assert.equal(blank.ok, false);
    const zeroQty = parseLotEdit(
      form({ ticker: "MSFT", qty: "0", cost_per_share: "10" }),
    );
    assert.equal(zeroQty.ok, false);
    const emptyQty = parseLotEdit(
      form({ ticker: "MSFT", qty: "", cost_per_share: "10" }),
    );
    assert.equal(emptyQty.ok, false);
    const zeroCost = parseLotEdit(
      form({ ticker: "MSFT", qty: "10", cost_per_share: "0" }),
    );
    assert.equal(zeroCost.ok, false);
  });
});

describe("parseLotId", () => {
  it("accepts a uuid and rejects junk", () => {
    const id = "aaaaaaaa-1111-4111-8111-111111111111";
    assert.equal(parseLotId(id), id);
    assert.equal(parseLotId("not-a-uuid"), null);
    assert.equal(parseLotId(""), null);
  });
});

describe("parseLotKey", () => {
  it("reads the hidden ticker+exchange+currency key", () => {
    assert.deepEqual(
      parseLotKey(
        form({
          orig_ticker: "msft",
          orig_exchange: "NASDAQ",
          orig_native: "usd",
        }),
      ),
      { ticker: "MSFT", exchange: "NASDAQ", native: "USD" },
    );
    assert.equal(parseLotKey(form({ orig_ticker: "MSFT" })), null);
    assert.equal(parseLotKey(form({})), null);
    assert.equal(
      parseLotKey(
        form({
          orig_ticker: "MSFT",
          orig_exchange: "NASDAQ",
          orig_native: "EUR",
        }),
      ),
      null,
    );
  });
});
