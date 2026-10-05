import { formatNoteMoney, looksNumericCell } from "@/lib/reports/typeset";
import {
  chartCaptionMeta,
  chartViewRows,
  type AllowedChart,
} from "@/lib/reports/charts";

function chartMax(chart: AllowedChart): number {
  const nums = chart.values.map((v) => Math.abs(v));
  if (chart.reference != null && Number.isFinite(chart.reference)) {
    nums.push(Math.abs(chart.reference));
  }
  return Math.max(1, ...nums);
}

function formatChartValue(chart: AllowedChart, value: number): string {
  if (chart.unit === "%") {
    const text = value.toFixed(2).replace(/\.?0+$/, "");
    return `${text || "0"}%`;
  }
  return formatNoteMoney(value) || String(value);
}

function formatViewCell(chart: AllowedChart, cell: string, col: number): string {
  if (col === 0) return cell;
  const n = Number(cell);
  if (!Number.isFinite(n) || cell.trim() === "") return cell;
  return formatChartValue(chart, n);
}

function LineSpark({ chart }: { chart: AllowedChart }) {
  const values = chart.values;
  if (values.length < 2) return <CssBars chart={chart} />;
  const w = 640;
  const h = 168;
  const padX = 12;
  const padY = 16;
  const extras = values.concat(
    chart.reference != null && Number.isFinite(chart.reference) ? [chart.reference] : [],
  );
  const min = Math.min(...extras);
  const max = Math.max(...extras);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = padX + (i / (values.length - 1)) * (w - padX * 2);
      const y = h - padY - ((v - min) / span) * (h - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const refY =
    chart.reference != null && Number.isFinite(chart.reference)
      ? h - padY - ((chart.reference - min) / span) * (h - padY * 2)
      : null;
  return (
    <svg
      className="note-doc__spark"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={chart.title || "line"}
    >
      {refY != null ? (
        <line
          className="note-doc__spark-ref"
          x1={padX}
          x2={w - padX}
          y1={refY}
          y2={refY}
        />
      ) : null}
      <polyline className="note-doc__spark-line" fill="none" points={pts} />
    </svg>
  );
}

function CssBars({ chart }: { chart: AllowedChart }) {
  return (
    <div className="note-doc__bars" aria-label={chart.type}>
      {chart.labels.map((label, idx) => {
        const value = chart.values[idx] ?? 0;
        const max = chartMax(chart);
        const width = Math.min(100, (Math.abs(value) / max) * 100);
        const ref =
          chart.reference != null && Number.isFinite(chart.reference)
            ? Math.min(100, (Math.abs(chart.reference) / max) * 100)
            : null;
        return (
          <div className="note-doc__bar" key={`${label}-${idx}`}>
            <b>{label}</b>
            <div className="note-doc__track">
              {ref != null ? (
                <div
                  className="note-doc__ref"
                  style={{ left: `${ref}%` }}
                  title={`${chart.reference}${chart.unit === "%" ? "%" : ""}`}
                />
              ) : null}
              <div className="note-doc__fill" style={{ width: `${width}%` }} />
            </div>
            <span className="note-doc__num">{formatChartValue(chart, value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChartTable({ rows, chart }: { rows: string[][]; chart: AllowedChart }) {
  return (
    <div className="note-doc__table-wrap">
      <table className="note-doc__table">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const shown = chart.type === "table" ? cell : formatViewCell(chart, cell, ci);
                return (
                  <td key={ci} className={looksNumericCell(shown) ? "note-doc__num" : undefined}>
                    {shown}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartBlock({ chart }: { chart: AllowedChart }) {
  const meta = chartCaptionMeta(chart);
  const viewRows = chartViewRows(chart);
  const showToggle = chart.type !== "table";
  return (
    <section
      className="note-doc__section note-doc__chart"
      aria-label={chart.title || "Figure"}
    >
      {chart.title ? <p className="note-doc__caption">{chart.title}</p> : null}
      {meta ? <p className="note-doc__chart-meta">{meta}</p> : null}
      {chart.type === "table" ? (
        <ChartTable rows={chart.rows} chart={chart} />
      ) : (
        <div className="note-doc__table-wrap">
          {chart.type === "line" ? <LineSpark chart={chart} /> : <CssBars chart={chart} />}
        </div>
      )}
      {showToggle && viewRows.length > 1 ? (
        <details className="note-doc__view-data">
          <summary>View data</summary>
          <ChartTable rows={viewRows} chart={chart} />
        </details>
      ) : null}
    </section>
  );
}

export function ReportCharts({
  charts,
  dropped,
}: {
  charts: AllowedChart[];
  dropped: string[];
}) {
  if (dropped.length > 0 && typeof console !== "undefined") {
    console.warn("dropped reports.charts types", dropped);
  }
  if (charts.length === 0) return null;

  const figures = charts.filter((chart) => {
    if (chart.type === "table") return chart.rows.length > 0;
    return chart.labels.length > 0;
  });
  if (figures.length === 0) return null;

  return (
    <>
      {figures.map((chart, i) => (
        <ChartBlock chart={chart} key={`${chart.type}-${chart.title}-${i}`} />
      ))}
    </>
  );
}
