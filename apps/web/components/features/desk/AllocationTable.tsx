"use client";

import { BookTable } from "@/components/features/desk/BookTable";
import { useQuotes } from "@/lib/market/use-quotes";

export type AllocationHolding = {
  ticker: string;
  company_name: string | null;
  qty: number;
  cost_per_share: number;
  native_currency: string;
  exchange: string;
};

export function AllocationTable({
  holdings,
  title = "Allocation",
}: {
  holdings: AllocationHolding[];
  title?: string;
}) {
  const { quotes, status } = useQuotes(
    holdings.map((h) => ({ ticker: h.ticker, exchange: h.exchange })),
  );
  return (
    <div className="desk__card">
      <h2>{title}</h2>
      <BookTable
        caption={
          status === "loading"
            ? "Loading previous close…"
            : "% of portfolio uses current value when every name has a close, otherwise last cost."
        }
        rows={holdings.map((h) => ({
          key: h.ticker,
          stock: h.company_name ?? h.ticker,
          ticker: h.ticker,
          qty: h.qty,
          costPerShare: h.cost_per_share,
          currency: h.native_currency,
          quote: quotes[h.ticker],
        }))}
      />
    </div>
  );
}
