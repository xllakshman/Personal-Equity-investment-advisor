import { BookTable } from "@/components/features/desk/BookTable";
import type { QuotePoint } from "@/lib/market/book-rows";
import type { NativeCurrency } from "@/lib/portfolio/exchange";
import { displayFxRate } from "@/lib/portfolio/fx";
import type { LotKind } from "@/lib/portfolio/lot-kind";

export type AllocationHolding = {
  ticker: string;
  company_name: string | null;
  qty: number;
  cost_per_share: number;
  native_currency: string;
  exchange: string;
  lot_kind?: LotKind;
};

export function AllocationTable({
  holdings,
  title = "Your holdings",
  quotes = {},
  displayCurrency = "USD",
  fxUsdInr,
  emptyCopy = "No stocks yet. Add a name on Review Portfolio.",
}: {
  holdings: AllocationHolding[];
  title?: string;
  quotes?: Record<string, QuotePoint | null>;
  displayCurrency?: NativeCurrency;
  fxUsdInr?: number;
  emptyCopy?: string;
}) {
  const fx = displayFxRate(fxUsdInr ?? null);
  return (
    <div className="desk__card">
      <h2>{title}</h2>
      <BookTable
        caption="Cost and quantity from your book. Unrealized P&L % uses previous close (display only). Change lots on Review Portfolio."
        emptyCopy={emptyCopy}
        displayCurrency={displayCurrency}
        fxUsdInr={fx}
        rows={holdings.map((h) => ({
          key: `${h.ticker}|${h.exchange}|${h.native_currency}|${h.lot_kind ?? "retail"}`,
          stock: h.company_name ?? h.ticker,
          ticker: h.ticker,
          qty: h.qty,
          costPerShare: h.cost_per_share,
          currency: h.native_currency,
          quote: quotes[h.ticker] ?? null,
        }))}
      />
    </div>
  );
}
