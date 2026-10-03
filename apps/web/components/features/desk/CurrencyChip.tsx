import type { NativeCurrency } from "@/lib/portfolio/exchange";

export function CurrencyChip({
  currency,
}: {
  currency: NativeCurrency;
}) {
  return (
    <span className="desk__chip" aria-label={`Display currency ${currency}`}>
      {currency}
    </span>
  );
}
