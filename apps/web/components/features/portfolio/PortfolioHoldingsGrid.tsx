"use client";

import { useActionState, useState } from "react";

import {
  deleteHoldingTicker,
  updateHoldingTicker,
} from "@/app/(desk)/portfolio/actions";
import { BookTable } from "@/components/features/desk/BookTable";
import { EMPTY_PORTFOLIO_STATE } from "@/lib/portfolio/action-state";
import { useQuotes } from "@/lib/market/use-quotes";

export type PortfolioHolding = {
  ticker: string;
  company_name: string | null;
  qty: number;
  cost_per_share: number;
  native_currency: string;
  exchange: string;
};

function rowKey(h: PortfolioHolding): string {
  return `${h.ticker}|${h.exchange}|${h.native_currency}`;
}

export function PortfolioHoldingsGrid({
  holdings,
  canWrite,
}: {
  holdings: PortfolioHolding[];
  canWrite: boolean;
}) {
  const [editState, editAction, editPending] = useActionState(
    updateHoldingTicker,
    EMPTY_PORTFOLIO_STATE,
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const editing = holdings.find((h) => rowKey(h) === editingKey) ?? null;
  const { quotes, status } = useQuotes(
    holdings.map((h) => ({ ticker: h.ticker, exchange: h.exchange })),
  );

  return (
    <div className="desk__card">
      <h2>Your book</h2>
      {canWrite && editing ? (
        <form className="pf__stack" action={editAction} style={{ marginTop: 14 }}>
          <input type="hidden" name="returnTo" value="/portfolio" />
          <input type="hidden" name="orig_ticker" value={editing.ticker} />
          <input type="hidden" name="orig_exchange" value={editing.exchange} />
          <input type="hidden" name="orig_native" value={editing.native_currency} />
          <p className="pf__card-title">Edit {editing.ticker}</p>
          <div className="pf__row">
            <input
              className="pf__input"
              name="ticker"
              defaultValue={editing.ticker}
              autoCapitalize="characters"
              required
            />
            <input
              className="pf__input"
              name="company_name"
              defaultValue={editing.company_name ?? ""}
              placeholder="Company name"
            />
          </div>
          <div className="pf__row">
            <input
              className="pf__input"
              name="qty"
              defaultValue={String(editing.qty)}
              placeholder="Qty"
              inputMode="decimal"
              required
            />
            <input
              className="pf__input"
              name="cost_per_share"
              defaultValue={String(editing.cost_per_share)}
              placeholder="Cost / share"
              inputMode="decimal"
              required
            />
            <select
              className="pf__input"
              name="currency"
              defaultValue={editing.native_currency}
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
            </select>
            <button className="desk__btn" type="submit" disabled={editPending}>
              {editPending ? "Saving…" : "Save"}
            </button>
            <button
              className="pf__ghost"
              type="button"
              onClick={() => setEditingKey(null)}
            >
              Cancel
            </button>
          </div>
          {editState.error ? <p className="pf__error">{editState.error}</p> : null}
        </form>
      ) : null}
      <BookTable
        showActions={canWrite}
        caption={
          status === "loading"
            ? "Loading previous close…"
            : "% of portfolio uses current value when every name has a close, otherwise last cost."
        }
        rows={holdings.map((h) => ({
          key: rowKey(h),
          stock: h.company_name ?? h.ticker,
          ticker: h.ticker,
          qty: h.qty,
          costPerShare: h.cost_per_share,
          currency: h.native_currency,
          quote: quotes[h.ticker],
          actions: canWrite ? (
            <>
              <button
                className="pf__ghost"
                type="button"
                onClick={() => setEditingKey(rowKey(h))}
              >
                Edit
              </button>
              <form
                action={deleteHoldingTicker}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      `Remove ${h.ticker} from your book? Saved notes stay.`,
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="returnTo" value="/portfolio" />
                <input type="hidden" name="orig_ticker" value={h.ticker} />
                <input type="hidden" name="orig_exchange" value={h.exchange} />
                <input type="hidden" name="orig_native" value={h.native_currency} />
                <button className="pf__ghost" type="submit">
                  Delete
                </button>
              </form>
            </>
          ) : undefined,
        }))}
      />
    </div>
  );
}
