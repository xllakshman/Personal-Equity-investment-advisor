import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCharts } from "./charts";

describe("parseCharts", () => {
  it("keeps allowlisted bar charts", () => {
    const { charts, dropped } = parseCharts([
      { type: "bar", title: "Peers", labels: ["A", "B"], values: [1, 2] },
    ]);
    assert.equal(dropped.length, 0);
    assert.equal(charts.length, 1);
    assert.equal(charts[0].type, "bar");
    assert.deepEqual(charts[0].values, [1, 2]);
  });

  it("drops html, script, and unknown types", () => {
    const { charts, dropped } = parseCharts([
      { type: "html", html: "<div>x</div>" },
      { type: "bar", title: "<script>alert(1)</script>", values: [1] },
      { type: "line", labels: ["<iframe>"] },
      { type: "mystery" },
    ]);
    assert.equal(charts.length, 0);
    assert.ok(dropped.includes("html"));
    assert.ok(dropped.includes("markup-title"));
    assert.ok(dropped.includes("mystery"));
  });

  it("accepts object maps and empty input", () => {
    assert.deepEqual(parseCharts(null).charts, []);
    assert.deepEqual(parseCharts({}).charts, []);
    const { charts } = parseCharts({
      price: { type: "line", title: "Close", labels: ["d1"], values: [10] },
    });
    assert.equal(charts[0].type, "line");
  });
});
