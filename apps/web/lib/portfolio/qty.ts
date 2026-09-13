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

export function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}
