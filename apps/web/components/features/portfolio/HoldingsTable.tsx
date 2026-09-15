import Link from "next/link";

import type { DisplayHoldingRow } from "@/lib/portfolio/grid";
import { formatMoney, formatQty, formatWeightPct } from "@/lib/portfolio/fx";
import type { NativeCurrency } from "@/lib/portfolio/exchange";

export function HoldingsTable({
  rows,
  displayCurrency,
}: {
  rows: DisplayHoldingRow[];
  displayCurrency: NativeCurrency;
}) {
  return (
    <div className="pf__table-wrap">
      <div className="pf__scroll">
        <table className="pf__table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Company</th>
              <th className="pf__num">Qty</th>
              <th className="pf__num">Cost</th>
              <th className="pf__num">Last</th>
              <th className="pf__num">Value</th>
              <th className="pf__num">P&amp;L</th>
              <th className="pf__num">Wt</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="pf__empty">
                  No lots yet. Upload a CSV or add a position.
                </td>
              </tr>
            ) : (
              rows.map((h) => (
                <tr key={`${h.ticker}-${h.exchange}-${h.native_currency}`}>
                  <td className="pf__ticker">
                    <Link href={`/analyse?ticker=${encodeURIComponent(h.ticker)}`}>
                      {h.ticker}
                    </Link>
                    {h.lot_count > 1 ? (
                      <span className="pf__lots">{h.lot_count} lots</span>
                    ) : null}
                  </td>
                  <td>{h.company_name ?? "—"}</td>
                  <td className="pf__num">{formatQty(h.qty)}</td>
                  <td className="pf__num">
                    {formatMoney(h.displayCost, displayCurrency)}
                  </td>
                  <td className="pf__num">—</td>
                  <td className="pf__num">
                    {formatMoney(h.displayValue, displayCurrency)}
                  </td>
                  <td className="pf__num">—</td>
                  <td className="pf__num pf__muted">
                    {formatWeightPct(h.weightPct)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
