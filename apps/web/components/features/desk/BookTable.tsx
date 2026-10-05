"use client";

import type { ReactNode } from "react";

import { bookMoney, type QuotePoint } from "@/lib/market/book-rows";
import type { NativeCurrency } from "@/lib/portfolio/exchange";
import { formatMoney } from "@/lib/portfolio/fx";
import { aggregateUnrealizedPct, formatPnlPct } from "@/lib/portfolio/unrealized-pnl";

export type BookTableRow = {
  key: string;
  stock: string;
  ticker: string;
  qty: number;
  costPerShare: number;
  currency: string;
  quote: QuotePoint | null | undefined;
  actions?: ReactNode;
};

function cell(value: number | null, currency: string): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatMoney(value, currency);
}

export function BookTable({
  rows,
  showActions = false,
  caption,
  emptyCopy = "No stocks yet. Add a name or upload a CSV on Review Portfolio.",
  displayCurrency,
  fxUsdInr,
}: {
  rows: BookTableRow[];
  showActions?: boolean;
  caption?: string;
  emptyCopy?: string;
  displayCurrency: NativeCurrency;
  fxUsdInr: number;
}) {
  const money = rows.map((r) =>
    bookMoney({
      qty: r.qty,
      costPerShare: r.costPerShare,
      nativeCurrency: r.currency,
      quote: r.quote,
      investedTotal: 0,
      valueTotal: null,
      displayCurrency,
      fxUsdInr,
    }),
  );
  const investedTotal = money.reduce((s, m) => s + m.invested, 0);
  const pricedCount = money.filter((m) => m.value != null).length;
  const valueSum = money.reduce((s, m) => s + (m.value ?? 0), 0);
  const allPriced = rows.length > 0 && pricedCount === rows.length;
  const valueForWeights = allPriced ? valueSum : null;
  const valueTotal = pricedCount > 0 ? valueSum : null;
  const unrealizedTotal =
    allPriced && rows.length > 0
      ? money.reduce((s, m) => s + (m.unrealized ?? 0), 0)
      : null;
  const unrealizedPctTotal = aggregateUnrealizedPct(
    money.map((m) => ({
      displayCost: m.invested,
      displayMarket: m.value,
    })),
  );

  const cols = showActions ? 10 : 9;
  const realizedTotal = null as number | null;

  return (
    <div className="pf__table-wrap">
      {caption ? <p className="pf__table-cap">{caption}</p> : null}
      <div className="pf__scroll">
        <table className="pf__table pf__table--book">
          <colgroup>
            <col className="pf__col-stock" />
            <col className="pf__col-ticker" />
            <col className="pf__col-num" />
            <col className="pf__col-num" />
            <col className="pf__col-num" />
            <col className="pf__col-num" />
            <col className="pf__col-num" />
            <col className="pf__col-pct" />
            <col className="pf__col-pct" />
            {showActions ? <col className="pf__col-act" /> : null}
          </colgroup>
          <thead>
            <tr>
              <th>Stock</th>
              <th>Ticker</th>
              <th className="pf__num">Invested</th>
              <th className="pf__num">Current price</th>
              <th className="pf__num">Current value</th>
              <th className="pf__num">Realized P&amp;L</th>
              <th className="pf__num">Unrealized P&amp;L</th>
              <th className="pf__num">Unrealized P&amp;L %</th>
              <th className="pf__num">% portfolio</th>
              {showActions ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={cols} className="pf__empty">
                  {emptyCopy}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const m = bookMoney({
                  qty: r.qty,
                  costPerShare: r.costPerShare,
                  nativeCurrency: r.currency,
                  quote: r.quote,
                  investedTotal,
                  valueTotal: valueForWeights,
                  displayCurrency,
                  fxUsdInr,
                });
                const plClass =
                  m.unrealized == null
                    ? ""
                    : m.unrealized >= 0
                      ? "pf__pl--up"
                      : "pf__pl--down";
                return (
                  <tr key={r.key}>
                    <td className="pf__stock">{r.stock}</td>
                    <td className="pf__ticker">{r.ticker}</td>
                    <td className="pf__num">{cell(m.invested, displayCurrency)}</td>
                    <td className="pf__num">{cell(m.price, displayCurrency)}</td>
                    <td className="pf__num">{cell(m.value, displayCurrency)}</td>
                    <td className="pf__num">{cell(m.realized, displayCurrency)}</td>
                    <td className={`pf__num ${plClass}`}>
                      {cell(m.unrealized, displayCurrency)}
                    </td>
                    <td className={`pf__num ${plClass}`}>
                      {formatPnlPct(m.unrealizedPct)}
                    </td>
                    <td className="pf__num">
                      {Number.isFinite(m.weightPct) ? `${m.weightPct.toFixed(1)}%` : "—"}
                    </td>
                    {showActions ? (
                      <td>
                        <div className="desk__lot-actions">{r.actions}</div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
          {rows.length > 0 ? (
            <tfoot>
              <tr>
                <td colSpan={2}>Total</td>
                <td className="pf__num">{cell(investedTotal, displayCurrency)}</td>
                <td className="pf__num">—</td>
                <td className="pf__num">
                  {valueTotal != null ? cell(valueTotal, displayCurrency) : "—"}
                </td>
                <td className="pf__num">{cell(realizedTotal, displayCurrency)}</td>
                <td
                  className={`pf__num ${
                    unrealizedTotal == null
                      ? ""
                      : unrealizedTotal >= 0
                        ? "pf__pl--up"
                        : "pf__pl--down"
                  }`}
                >
                  {unrealizedTotal != null
                    ? cell(unrealizedTotal, displayCurrency)
                    : "—"}
                </td>
                <td
                  className={`pf__num ${
                    unrealizedPctTotal == null
                      ? ""
                      : unrealizedPctTotal >= 0
                        ? "pf__pl--up"
                        : "pf__pl--down"
                  }`}
                >
                  {formatPnlPct(unrealizedPctTotal)}
                </td>
                <td className="pf__num">100%</td>
                {showActions ? <td /> : null}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
