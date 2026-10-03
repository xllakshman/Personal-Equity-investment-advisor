"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  addManualLot,
  deleteHoldingLot,
  EMPTY_PORTFOLIO_STATE,
  updateHoldingLot,
} from "@/app/(desk)/portfolio/actions";
import { BookTable } from "@/components/features/desk/BookTable";
import type { HoldingLotRow } from "@/lib/portfolio/load";
import { useQuotes } from "@/lib/market/use-quotes";

export function HomeBook({
  lots,
  canWrite,
}: {
  lots: HoldingLotRow[];
  canWrite: boolean;
}) {
  const [addState, addAction, addPending] = useActionState(
    addManualLot,
    EMPTY_PORTFOLIO_STATE,
  );
  const [editState, editAction, editPending] = useActionState(
    updateHoldingLot,
    EMPTY_PORTFOLIO_STATE,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = lots.find((l) => l.id === editingId) ?? null;
  const { quotes, status } = useQuotes(
    lots.map((l) => ({ ticker: l.ticker, exchange: l.exchange })),
  );

  return (
    <div className="desk__card" style={{ marginTop: 22 }}>
      <h2>Your holdings</h2>
      <p className="desk__lede">
        Add, edit or delete lots here. Price is the previous regular-session
        close. Realized P&amp;L stays — until a sale is stored (lots only keep
        remaining shares). CSV upload stays on Portfolio.
      </p>

      {canWrite ? (
        <form className="pf__stack" action={addAction} style={{ marginTop: 14 }}>
          <input type="hidden" name="returnTo" value="/desk" />
          <div className="pf__row">
            <input
              className="pf__input"
              name="ticker"
              placeholder="Ticker"
              autoCapitalize="characters"
              required
            />
            <input
              className="pf__input"
              name="company_name"
              placeholder="Company name"
            />
          </div>
          <div className="pf__row">
            <input
              className="pf__input"
              name="cost_per_share"
              placeholder="Cost / share"
              inputMode="decimal"
              required
            />
            <input
              className="pf__input"
              name="total_purchased"
              placeholder="Total purchased"
              inputMode="decimal"
              required
            />
            <select className="pf__input" name="currency" defaultValue="auto">
              <option value="auto">Auto currency</option>
              <option value="USD">USD</option>
              <option value="INR">INR</option>
            </select>
            <button className="desk__btn" type="submit" disabled={addPending}>
              {addPending ? "Adding…" : "Add stock"}
            </button>
          </div>
          {addState.error ? <p className="pf__error">{addState.error}</p> : null}
        </form>
      ) : (
        <p className="desk__kpi-s" style={{ marginTop: 10 }}>
          Viewers can see this book and saved notes. They cannot change lots.
        </p>
      )}

      {editing && canWrite ? (
        <form className="pf__stack" action={editAction} style={{ marginTop: 16 }}>
          <input type="hidden" name="returnTo" value="/desk" />
          <input type="hidden" name="lotId" value={editing.id} />
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
              name="cost_per_share"
              defaultValue={String(editing.cost_per_share)}
              inputMode="decimal"
              required
            />
            <input
              className="pf__input"
              name="total_purchased"
              defaultValue={String(editing.qty * editing.cost_per_share)}
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
              onClick={() => setEditingId(null)}
            >
              Cancel
            </button>
          </div>
          {editState.error ? <p className="pf__error">{editState.error}</p> : null}
        </form>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <BookTable
          showActions
          caption={
            status === "loading"
              ? "Loading previous close…"
              : "Price = previous regular-session close. Desk load does not fetch Yahoo."
          }
          rows={lots.map((lot) => ({
            key: lot.id,
            stock: lot.company_name ?? lot.ticker,
            ticker: lot.ticker,
            qty: lot.qty,
            costPerShare: lot.cost_per_share,
            currency: lot.native_currency,
            quote: quotes[lot.ticker],
            actions: (
              <>
                <Link
                  href={`/analyse?ticker=${encodeURIComponent(lot.ticker)}`}
                  className="pf__ghost"
                  style={{ textDecoration: "none" }}
                >
                  Analyse
                </Link>
                {canWrite ? (
                  <>
                    <button
                      className="pf__ghost"
                      type="button"
                      onClick={() => setEditingId(lot.id)}
                    >
                      Edit
                    </button>
                    <form
                      action={deleteHoldingLot}
                      onSubmit={(e) => {
                        if (
                          !window.confirm(
                            `Remove ${lot.ticker} from your book? Saved notes stay.`,
                          )
                        ) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="returnTo" value="/desk" />
                      <input type="hidden" name="lotId" value={lot.id} />
                      <button className="pf__ghost" type="submit">
                        Delete
                      </button>
                    </form>
                  </>
                ) : null}
              </>
            ),
          }))}
        />
      </div>
    </div>
  );
}
