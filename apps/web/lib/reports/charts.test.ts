import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { chartCaptionMeta, chartViewRows, parseCharts } from "./charts";

describe("parseCharts", () => {
  it("keeps allowlisted bar charts", () => {
    const { charts, dropped } = parseCharts([
      { type: "bar", title: "Peers", labels: ["A", "B"], values: [1, 2] },
    ]);
    assert.equal(dropped.length, 0);
    assert.equal(charts.length, 1);
    assert.equal(charts[0].type, "bar");
    assert.deepEqual(charts[0].values, [1, 2]);
    assert.equal(charts[0].source, undefined);
    assert.equal(charts[0].as_of, undefined);
  });

  it("drops html, script, svg, and unknown types", () => {
    const { charts, dropped } = parseCharts([
      { type: "html", html: "<div>x</div>" },
      { type: "bar", title: "<script>alert(1)</script>", values: [1] },
      { type: "line", labels: ["<iframe>"] },
      { type: "svg", svg: "<svg></svg>" },
      { type: "mystery" },
    ]);
    assert.equal(charts.length, 0);
    assert.ok(dropped.includes("html"));
    assert.ok(dropped.includes("markup-title"));
    assert.ok(dropped.includes("svg"));
    assert.ok(dropped.includes("mystery"));
  });

  it("accepts object maps and empty input", () => {
    assert.deepEqual(parseCharts(null).charts, []);
    assert.deepEqual(parseCharts({}).charts, []);
    assert.deepEqual(parseCharts([]).charts, []);
    const { charts } = parseCharts({
      price: { type: "line", title: "Close", labels: ["d1"], values: [10] },
    });
    assert.equal(charts[0].type, "line");
  });

  it("keeps a system price_vs_tranches line and drops pie", () => {
    const { charts, dropped } = parseCharts({
      price_vs_tranches: {
        type: "line",
        title: "Price vs 52-week",
        labels: ["2026-01", "2026-02"],
        values: [90, 80],
        source: "Yahoo Finance chart v8",
        as_of: "2026-02-28",
      },
      pie: { type: "pie", title: "Segments", labels: ["A", "B"], values: [60, 40] },
    });
    assert.equal(charts.length, 1);
    assert.equal(charts[0].type, "line");
    assert.equal(charts[0].source, "Yahoo Finance chart v8");
    assert.equal(charts[0].as_of, "2026-02-28");
    assert.ok(dropped.includes("pie"));
  });

  it("keeps system roic_history bars and drops html", () => {
    const { charts, dropped } = parseCharts({
      roic_history: {
        type: "bar",
        title: "ROIC vs 15%",
        labels: ["2024"],
        values: [18.25],
        reference: 15,
        unit: "%",
        source: "SEC companyfacts",
        as_of: "FY 2024",
      },
      cash_conversion: {
        type: "bar",
        title: "Cash conversion vs 80%",
        labels: ["2024 FCF/NI"],
        values: [91.2],
        reference: 80,
        unit: "%",
      },
      evil: { type: "html", html: "<script>alert(1)</script>" },
      pie: { type: "pie", title: "Segments", labels: ["A"], values: [1] },
    });
    assert.equal(charts.length, 2);
    assert.equal(charts[0].type, "bar");
    assert.equal(charts[0].reference, 15);
    assert.equal(charts[0].unit, "%");
    assert.equal(charts[0].source, "SEC companyfacts");
    assert.ok(dropped.includes("html"));
    assert.ok(dropped.includes("pie"));
  });

  it("keeps trailing P/E history bars and never a consensus Forward P/E chart", () => {
    const { charts, dropped } = parseCharts({
      trailing_pe_history: {
        type: "bar",
        title: "Trailing P/E vs history",
        labels: ["2023", "2024", "TTM"],
        values: [18, 20, 22],
        source: "SEC companyfacts + Yahoo Finance chart v8",
        as_of: "FY 2024",
      },
      consensus_forward: {
        type: "html",
        title: "Forward P/E",
        html: "<div>22x</div>",
      },
    });
    assert.equal(charts.length, 1);
    assert.equal(charts[0].title, "Trailing P/E vs history");
    assert.equal(charts[0].type, "bar");
    assert.ok(!charts[0].title.includes("Forward P/E"));
    assert.ok(dropped.includes("html"));
  });

  it("strips markup and prompt-like source without dropping the series", () => {
    const { charts, dropped } = parseCharts([
      {
        type: "bar",
        title: "Peers",
        labels: ["A"],
        values: [1],
        source: "<svg>Yahoo</svg> prompt_versions.body",
        as_of: "<iframe>2026-01-01",
      },
    ]);
    assert.equal(dropped.length, 0);
    assert.equal(charts[0].source, undefined);
    assert.equal(charts[0].as_of, undefined);
    assert.deepEqual(charts[0].values, [1]);
  });
});

describe("chartCaptionMeta + chartViewRows", () => {
  it("joins source and as_of when present", () => {
    assert.equal(chartCaptionMeta({ type: "bar", title: "x", labels: [], values: [], rows: [] }), "");
    assert.equal(
      chartCaptionMeta({
        type: "line",
        title: "Price vs 52-week",
        labels: ["a"],
        values: [1],
        rows: [],
        source: "Yahoo Finance chart v8",
        as_of: "2026-02-28",
      }),
      "Yahoo Finance chart v8 · as of 2026-02-28",
    );
  });

  it("lists the same points for View data, including a reference", () => {
    const rows = chartViewRows({
      type: "bar",
      title: "ROIC vs 15%",
      labels: ["2024"],
      values: [18.25],
      rows: [],
      reference: 15,
      unit: "%",
    });
    assert.deepEqual(rows[0], ["Period", "Value"]);
    assert.deepEqual(rows[1], ["2024", "18.25"]);
    assert.deepEqual(rows[2], ["Reference", "15"]);
  });

  it("reuses table rows as View data", () => {
    const rows = [
      ["Level", "Value"],
      ["T2", "80"],
    ];
    assert.deepEqual(
      chartViewRows({ type: "table", title: "Levels", labels: [], values: [], rows }),
      rows,
    );
  });
});
