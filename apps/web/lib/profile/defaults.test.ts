import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultLtcgHoldingMonths,
  parseBlackoutWindows,
  profileDefaults,
  showLrsFields,
} from "./defaults";

describe("profileDefaults", () => {
  it("has no max_positions and no $150,000 LRS cap", () => {
    const us = profileDefaults("us");
    assert.equal("max_positions" in us, false);
    assert.equal(us.concentration_cap_pct, 15);
    assert.equal(us.lrs_annual_cap_usd, null);
    assert.equal(us.cannot_trade_us_options, false);
    assert.equal(us.ltcg_holding_months, 12);
    assert.equal(us.tranche_t1_pct, 35);
    assert.deepEqual(us.blackout_windows, []);
    assert.equal(JSON.stringify(us).includes("150000"), false);
    assert.equal(JSON.stringify(us).includes("150,000"), false);
  });

  it("sets India LTCG months to 24 and shows LRS", () => {
    const india = profileDefaults("india");
    assert.equal(india.ltcg_holding_months, 24);
    assert.equal(defaultLtcgHoldingMonths("india"), 24);
    assert.equal(india.cannot_trade_us_options, true);
    assert.equal(india.lrs_enabled, true);
    assert.equal(india.lrs_annual_cap_usd, null);
    assert.equal(showLrsFields("india"), true);
    assert.equal(showLrsFields("us"), false);
  });

  it("keeps a typed blackout window", () => {
    const rows = parseBlackoutWindows([
      { label: "Earnings", start: "2026-10-01", end: "2026-10-05" },
      { label: "", start: "", end: "" },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].label, "Earnings");
  });
});
