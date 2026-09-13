export function allocationPct(invested: number, portfolio: number): number {
  if (!(portfolio > 0) || !Number.isFinite(invested)) return 0;
  return (invested / portfolio) * 100;
}

export function allocationNote(pct: number): string {
  if (pct > 25) {
    return "More than one stock should usually be — the note will flag the risk";
  }
  if (pct < 2) {
    return "A small position — we will assume you can build it up over time";
  }
  return "A normal size for a single stock";
}

export function moneyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${currency}`;
  }
}

export function modelCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
