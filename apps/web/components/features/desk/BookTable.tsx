"use client";

import type { ReactNode } from "react";

import { bookMoney, type QuotePoint } from "@/lib/market/book-rows";
import { formatMoney } from "@/lib/portfolio/fx";

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
}: {
  rows: BookTableRow[];
  showActions?: boolean;
  caption?: string;
}) {
  const investedTotal = rows.reduce((s, r) => s + r.qty * r.costPerShare, 0);
  const values = rows.map((r) => {
    const m = bookMoney({
      qty: r.qty,
      costPerShare: r.costPerShare,
      nativeCurrency: r.currency,
      quote: r.quote,
      investedTotal,
      valueTotal: null,
    });
    return m.value;
  });
  const pricedCount = values.filter((v) => v != null).length;
  const valueSum = values.reduce((s, v) => s + (v ?? 0), 0);
  const allPriced = rows.length > 0 && pricedCount === rows.length;
  const valueForWeights = allPriced ? valueSum : null;
  const valueTotal = pricedCount > 0 ? valueSum : null;

  const cols = showActions ? 9 : 8;
  const currencies = new Set(rows.map((r) => r.currency.toUpperCase()));
  const oneCcy = currencies.size === 1 ? (rows[0]?.currency ?? "USD") : null;
  const realizedTotal = null as number | null;
  const unrealizedTotal =
    oneCcy && pricedCount > 0
      ? values.reduce((s, v, i) => {
          if (v == null) return s;
          const row = rows[i];
          if (!row) return s;
          return s + (v - row.qty * row.costPerShare);
        }, 0)
      : null;

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
              <th className="pf__num">% portfolio</th>
              {showActions ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={cols} className="pf__empty">
                  No stocks yet. Add a lot below, or upload a CSV on Portfolio.
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
                    <td className="pf__num">{cell(m.invested, r.currency)}</td>
                    <td className="pf__num">{cell(m.price, r.currency)}</td>
                    <td className="pf__num">{cell(m.value, r.currency)}</td>
                    <td className="pf__num">{cell(m.realized, r.currency)}</td>
                    <td className={`pf__num ${plClass}`}>
                      {cell(m.unrealized, r.currency)}
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
                <td className="pf__num">
                  {oneCcy ? cell(investedTotal, oneCcy) : "—"}
                </td>
                <td className="pf__num">—</td>
                <td className="pf__num">
                  {oneCcy ? cell(valueTotal, oneCcy) : "—"}
                </td>
                <td className="pf__num">
                  {oneCcy ? cell(realizedTotal, oneCcy) : "—"}
                </td>
                <td
                  className={`pf__num ${
                    unrealizedTotal == null
                      ? ""
                      : unrealizedTotal >= 0
                        ? "pf__pl--up"
                        : "pf__pl--down"
                  }`}
                >
                  {oneCcy ? cell(unrealizedTotal, oneCcy) : "—"}
                </td>
                <td className="pf__num">{oneCcy ? "100%" : "—"}</td>
                {showActions ? <td /> : null}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
