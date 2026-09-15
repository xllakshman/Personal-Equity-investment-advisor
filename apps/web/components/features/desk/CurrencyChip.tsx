"use client";

import { usePathname } from "next/navigation";

import { toggleDisplayCurrency } from "@/app/(desk)/portfolio/actions";
import type { NativeCurrency } from "@/lib/portfolio/exchange";

export function CurrencyChip({
  currency,
}: {
  currency: NativeCurrency;
}) {
  const pathname = usePathname() || "/desk";
  return (
    <form action={toggleDisplayCurrency}>
      <input type="hidden" name="returnTo" value={pathname} />
      <button type="submit" className="desk__chip" aria-label="Toggle display currency">
        {currency}
      </button>
    </form>
  );
}
