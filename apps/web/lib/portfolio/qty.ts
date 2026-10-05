/** qty = total_purchased / cost_per_share. Never applies FX. */
export function qtyFromTotals(
  totalPurchased: number,
  costPerShare: number,
): number | null {
  if (!Number.isFinite(totalPurchased) || !Number.isFinite(costPerShare)) {
    return null;
  }
  if (totalPurchased <= 0 || costPerShare <= 0) return null;
  return totalPurchased / costPerShare;
}

/** Prefill Edit Total purchased from stored qty × cost. Never writes FX. */
export function totalPurchasedDisplay(qty: number, costPerShare: number): string {
  if (!Number.isFinite(qty) || !Number.isFinite(costPerShare)) return "";
  if (qty <= 0 || costPerShare <= 0) return "";
  const total = qty * costPerShare;
  if (!Number.isFinite(total) || total <= 0) return "";
  if (Number.isInteger(total)) return String(total);
  return String(Math.round(total * 100) / 100);
}

export function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}
