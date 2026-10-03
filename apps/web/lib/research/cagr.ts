export type ClosePoint = { ts: number; close: number };

export type PeriodReturns = {
  y1: number | null;
  y3: number | null;
  y5: number | null;
  y10: number | null;
  asOf: string | null;
};

const YEAR_SEC = 365.25 * 24 * 3600;

export function parseMonthlyCloses(payload: unknown): ClosePoint[] {
  if (!payload || typeof payload !== "object") return [];
  const chart = (payload as { chart?: { result?: unknown[] } }).chart;
  const row = chart?.result?.[0];
  if (!row || typeof row !== "object") return [];
  const timestamps = (row as { timestamp?: unknown[] }).timestamp;
  const closes = (
    row as { indicators?: { quote?: { close?: unknown[] }[] } }
  ).indicators?.quote?.[0]?.close;
  if (!Array.isArray(timestamps) || !Array.isArray(closes)) return [];
  const out: ClosePoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = Number(timestamps[i]);
    const close = Number(closes[i]);
    if (!Number.isFinite(ts) || !Number.isFinite(close) || close <= 0) continue;
    out.push({ ts, close });
  }
  return out;
}

export function closeNear(
  points: ClosePoint[],
  targetTs: number,
  maxDriftSec = 120 * 24 * 3600,
): number | null {
  let best: ClosePoint | null = null;
  let bestDrift = Infinity;
  for (const p of points) {
    const drift = Math.abs(p.ts - targetTs);
    if (drift > maxDriftSec) continue;
    if (drift < bestDrift) {
      best = p;
      bestDrift = drift;
    }
  }
  return best?.close ?? null;
}

export function totalReturn(end: number, start: number): number | null {
  if (!(end > 0) || !(start > 0)) return null;
  return end / start - 1;
}

export function annualized(end: number, start: number, years: number): number | null {
  if (!(end > 0) || !(start > 0) || !(years > 0)) return null;
  return (end / start) ** (1 / years) - 1;
}

export function periodReturns(points: ClosePoint[]): PeriodReturns {
  if (points.length < 2) {
    return { y1: null, y3: null, y5: null, y10: null, asOf: null };
  }
  const last = points[points.length - 1]!;
  const asOf = new Date(last.ts * 1000).toISOString().slice(0, 10);
  const end = last.close;
  const y = (years: number) => {
    const start = closeNear(points, last.ts - years * YEAR_SEC);
    if (start == null) return null;
    return years <= 1 ? totalReturn(end, start) : annualized(end, start, years);
  };
  return {
    y1: y(1),
    y3: y(3),
    y5: y(5),
    y10: y(10),
    asOf,
  };
}

export function pctLabel(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
