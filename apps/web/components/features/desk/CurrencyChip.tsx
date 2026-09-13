"use client";

import { toggleDisplayCurrency } from "@/app/(desk)/portfolio/actions";
import type { NativeCurrency } from "@/lib/portfolio/exchange";

export function CurrencyChip({
  currency,
}: {
  currency: NativeCurrency;
}) {
  return (
    <form action={toggleDisplayCurrency}>
      <button type="submit" className="desk__chip" aria-label="Toggle display currency">
        {currency}
      </button>
    </form>
  );
}
