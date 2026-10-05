import { formatNoteMoney, looksNumericCell } from "@/lib/reports/typeset";
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

  const figures = charts.filter((chart) => {
    if (chart.type === "table") return chart.rows.length > 0;
    return chart.labels.length > 0;
  });
  if (figures.length === 0) return null;

  return (
    <>
      {figures.map((chart, i) => (
        <section
          className="note-doc__section"
          key={`${chart.type}-${i}`}
          aria-label={chart.title || "Figure"}
        >
          {chart.title ? <p className="note-doc__caption">{chart.title}</p> : null}
          {chart.type === "table" ? (
            <div className="note-doc__table-wrap">
              <table className="note-doc__table">
                <tbody>
                  {chart.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className={looksNumericCell(cell) ? "note-doc__num" : undefined}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="note-doc__table-wrap">
              <div className="note-doc__bars" aria-label={chart.type}>
                {chart.labels.map((label, idx) => {
                  const value = chart.values[idx] ?? 0;
                  const max = Math.max(1, ...chart.values.map((v) => Math.abs(v)));
                  const width = Math.min(100, (Math.abs(value) / max) * 100);
                  return (
                    <div className="note-doc__bar" key={`${label}-${idx}`}>
                      <b>{label}</b>
                      <div className="note-doc__track">
                        <div className="note-doc__fill" style={{ width: `${width}%` }} />
                      </div>
                      <span className="note-doc__num">{formatNoteMoney(value) || String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ))}
    </>
  );
}
