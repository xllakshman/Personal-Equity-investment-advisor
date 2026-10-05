import { BookTable } from "@/components/features/desk/BookTable";

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
  title = "Your holdings",
}: {
  holdings: AllocationHolding[];
  title?: string;
}) {
  return (
    <div className="desk__card">
      <h2>{title}</h2>
      <BookTable
        caption="Cost and quantity from your book. Current price and P&L stay — on Home (not a live price). Change lots on Review Portfolio."
        rows={holdings.map((h) => ({
          key: h.ticker,
          stock: h.company_name ?? h.ticker,
          ticker: h.ticker,
          qty: h.qty,
          costPerShare: h.cost_per_share,
          currency: h.native_currency,
          quote: null,
        }))}
      />
    </div>
  );
}
