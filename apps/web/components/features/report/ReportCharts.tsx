import type { AllowedChart } from "@/lib/reports/charts";

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
  return (
    <div className="desk__card" style={{ marginTop: 22 }}>
      <h2>Charts</h2>
      <p className="desk__lede">Allowlisted types only: line, bar, table, waterfall.</p>
      {charts.map((chart, i) => (
        <div key={`${chart.type}-${i}`} style={{ marginTop: 16 }}>
          {chart.title ? <h3>{chart.title}</h3> : null}
          {chart.type === "table" ? (
            <table className="pf__table">
              <tbody>
                {chart.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="report__bars" aria-label={chart.type}>
              {chart.labels.map((label, idx) => {
                const value = chart.values[idx] ?? 0;
                const max = Math.max(1, ...chart.values.map((v) => Math.abs(v)));
                const width = Math.min(100, (Math.abs(value) / max) * 100);
                return (
                  <div className="desk__bar" key={`${label}-${idx}`}>
                    <b>{label}</b>
                    <div className="desk__track">
                      <div className="desk__fill" style={{ width: `${width}%` }} />
                    </div>
                    <span className="desk__kpi-s">{value}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
