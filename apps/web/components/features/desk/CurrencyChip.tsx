"use client";

import { usePathname } from "next/navigation";

import { toggleDisplayCurrency } from "@/app/(desk)/portfolio/actions";
import type { NativeCurrency } from "@/lib/portfolio/exchange";

export function CurrencyChip({
  currency,
}: {
  currency: NativeCurrency;
}) {
  const path = usePathname() || "/desk";
  const next = currency === "USD" ? "INR" : "USD";
  return (
    <form action={toggleDisplayCurrency}>
      <input type="hidden" name="returnTo" value={path} />
      <button
        className="desk__chip"
        type="submit"
        title={`Numbers on this desk are shown in ${currency}. Click to show ${next}. Stored lots stay in their native currency.`}
      >
        Show in {currency}
      </button>
    </form>
  );
}
