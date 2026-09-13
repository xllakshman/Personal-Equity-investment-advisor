export type HoldingRow = {
  ticker: string;
  company_name: string | null;
  qty: number;
  cost_per_share: number;
  native_currency: string;
  last_checked_at: string | null;
};

export function costBasisNative(rows: HoldingRow[]): number {
  return rows.reduce((sum, r) => {
    const qty = Number(r.qty);
    const cost = Number(r.cost_per_share);
    if (!Number.isFinite(qty) || !Number.isFinite(cost)) return sum;
    return sum + qty * cost;
  }, 0);
}

export function allocationWeights(rows: HoldingRow[]): {
  ticker: string;
  pct: number;
}[] {
  const total = costBasisNative(rows);
  if (total <= 0) {
    return rows.map((r) => ({ ticker: r.ticker, pct: 0 }));
  }
  return rows.map((r) => ({
    ticker: r.ticker,
    pct: (100 * r.qty * r.cost_per_share) / total,
  }));
}

export function lastCheckedLabel(iso: string | null, now = new Date()): string {
  if (!iso) return "never";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "never";
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
