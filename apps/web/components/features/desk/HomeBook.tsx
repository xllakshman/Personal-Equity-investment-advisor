"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  addManualLot,
  deleteHoldingLot,
  EMPTY_PORTFOLIO_STATE,
  updateHoldingLot,
} from "@/app/(desk)/portfolio/actions";
import type { HoldingLotRow } from "@/lib/portfolio/load";
import { formatMoney, formatQty } from "@/lib/portfolio/fx";

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

  return (
    <div className="desk__card" style={{ marginTop: 22 }}>
      <h2>Your stocks</h2>
      <p className="desk__lede">
        Add, change, or remove lots here. CSV upload stays on Portfolio. Analyse
        does not require a lot.
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

      <div className="pf__table-wrap" style={{ marginTop: 16 }}>
        <div className="pf__scroll">
          <table className="pf__table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company</th>
                <th className="pf__num">Qty</th>
                <th className="pf__num">Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pf__empty">
                    No lots yet. Add a stock above, or upload a CSV on Portfolio.
                  </td>
                </tr>
              ) : (
                lots.map((lot) => (
                  <tr key={lot.id}>
                    <td className="pf__ticker">
                      <Link href={`/analyse?ticker=${encodeURIComponent(lot.ticker)}`}>
                        {lot.ticker}
                      </Link>
                    </td>
                    <td>{lot.company_name ?? "—"}</td>
                    <td className="pf__num">{formatQty(lot.qty)}</td>
                    <td className="pf__num">
                      {formatMoney(lot.cost_per_share, lot.native_currency)}
                    </td>
                    <td>
                      <div className="desk__lot-actions">
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
