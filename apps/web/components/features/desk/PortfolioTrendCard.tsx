"use client";

import { useState } from "react";

import type { PortfolioTrendPayload } from "@/lib/desk/load-portfolio-trend";
import {
  TREND_PERIODS,
  formatIsoDate,
  formatTrendPct,
  type TrendPeriod,
} from "@/lib/desk/portfolio-trend";

const LABELS: Record<TrendPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function polyline(
  values: (number | null)[],
  width: number,
  height: number,
  pad: number,
): string {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length < 2) return "";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const n = values.length;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) continue;
    const x = pad + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = pad + innerH - ((v - min) / span) * innerH;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

export function PortfolioTrendCard({
  trend,
}: {
  trend: PortfolioTrendPayload;
}) {
  const [period, setPeriod] = useState<TrendPeriod>("monthly");
  const series = trend.periods[period];
  const empty = trend.emptyBook;
  const tabThin = series.dates.length < 2;
  const start = formatIsoDate(series.dates[0]);
  const end = formatIsoDate(series.dates[series.dates.length - 1]);

  const w = 640;
  const h = 180;
  const pad = 12;
  const portLine = polyline(series.portfolio, w, h, pad);
  const nqLine = polyline(series.nasdaq, w, h, pad);
  const spLine = polyline(series.sp500, w, h, pad);

  return (
    <section className="desk__card desk__trend" aria-labelledby="desk-trend-title">
      <div className="desk__trend-head">
        <h2 id="desk-trend-title">Portfolio vs NASDAQ and S&amp;P</h2>
        <div className="desk__trend-tabs" role="tablist" aria-label="Trend period">
          {TREND_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              className={
                period === p ? "desk__trend-tab desk__trend-tab--on" : "desk__trend-tab"
              }
              onClick={() => setPeriod(p)}
            >
              {LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      {empty ? (
        <p className="desk__kpi-s">— Add holdings on Review Portfolio. Home does not invent a price.</p>
      ) : trend.unavailable ? (
        <p className="desk__kpi-s">— Quotes unavailable for this book. Home did not write prices into your lots.</p>
      ) : tabThin ? (
        <p className="desk__kpi-s">— Not enough daily closes for {LABELS[period]}.</p>
      ) : (
        <>
          <svg
            className="desk__trend-svg"
            viewBox={`0 0 ${w} ${h}`}
            role="img"
            aria-label={`Indexed portfolio, NASDAQ Composite, and S&P 500 for ${LABELS[period]}`}
          >
            {nqLine ? (
              <polyline fill="none" stroke="#0a84ff" strokeWidth="2" points={nqLine} />
            ) : null}
            {spLine ? (
              <polyline fill="none" stroke="#bf5af2" strokeWidth="2" points={spLine} />
            ) : null}
            {portLine ? (
              <polyline fill="none" stroke="#1d1d1f" strokeWidth="2.5" points={portLine} />
            ) : null}
          </svg>
          <ul className="desk__trend-legend">
            <li>
              <span className="desk__trend-swatch desk__trend-swatch--port" />
              Your book {formatTrendPct(series.portfolioPct)}
            </li>
            <li>
              <span className="desk__trend-swatch desk__trend-swatch--nq" />
              NASDAQ {formatTrendPct(series.nasdaqPct)}
            </li>
            <li>
              <span className="desk__trend-swatch desk__trend-swatch--sp" />
              S&amp;P 500 {formatTrendPct(series.sp500Pct)}
            </li>
          </ul>
          <p className="desk__kpi-s">
            {start} – {end}
            {trend.asOf ? ` · as of ${formatIsoDate(trend.asOf)}` : ""}
            . Current lots × Yahoo daily closes (display only).
          </p>
        </>
      )}
    </section>
  );
}
