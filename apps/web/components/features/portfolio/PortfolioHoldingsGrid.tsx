"use client";

import { useActionState, useState } from "react";

import {
  deleteHoldingTicker,
  updateHoldingTicker,
} from "@/app/(desk)/portfolio/actions";
import { BookTable } from "@/components/features/desk/BookTable";
import { LotKindFields } from "@/components/features/portfolio/LotKindFields";
import type { QuotePoint } from "@/lib/market/book-rows";
import { EMPTY_PORTFOLIO_STATE } from "@/lib/portfolio/action-state";
import type { NativeCurrency } from "@/lib/portfolio/exchange";
import { displayFxRate } from "@/lib/portfolio/fx";
import {
  LOT_KIND_LABEL,
  splitByLotKind,
  type LotKind,
} from "@/lib/portfolio/lot-kind";
import {
  aggregateUnrealizedPct,
  formatPnlPct,
  holdingDisplayPnl,
} from "@/lib/portfolio/unrealized-pnl";

export type PortfolioHolding = {
  ticker: string;
  company_name: string | null;
  qty: number;
  cost_per_share: number;
  native_currency: string;
  exchange: string;
  lot_kind: LotKind;
};

function rowKey(h: PortfolioHolding): string {
  return `${h.ticker}|${h.exchange}|${h.native_currency}|${h.lot_kind}`;
}

function sleevePct(
  rows: PortfolioHolding[],
  quotes: Record<string, QuotePoint | null>,
  displayCurrency: NativeCurrency,
  fx: number,
): number | null {
  return aggregateUnrealizedPct(
    rows.map((h) =>
      holdingDisplayPnl({
        qty: h.qty,
        costPerShare: h.cost_per_share,
        nativeCurrency: h.native_currency,
        quote: quotes[h.ticker],
        displayCurrency,
        fxUsdInr: fx,
      }),
    ),
  );
}

export function PortfolioHoldingsGrid({
  holdings,
  canWrite,
  quotes,
  displayCurrency,
  fxUsdInr,
  lotKindColumnPresent,
}: {
  holdings: PortfolioHolding[];
  canWrite: boolean;
  quotes: Record<string, QuotePoint | null>;
  displayCurrency: NativeCurrency;
  fxUsdInr: number;
  lotKindColumnPresent: boolean;
}) {
  const [editState, editAction, editPending] = useActionState(
    updateHoldingTicker,
    EMPTY_PORTFOLIO_STATE,
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const editing = holdings.find((h) => rowKey(h) === editingKey) ?? null;
  const fx = displayFxRate(fxUsdInr);
  const { retail, esop } = splitByLotKind(holdings);
  const overallPct = sleevePct(holdings, quotes, displayCurrency, fx);
  const retailPct = sleevePct(retail, quotes, displayCurrency, fx);
  const esopPct = sleevePct(esop, quotes, displayCurrency, fx);

  function tableFor(kind: LotKind, rows: PortfolioHolding[]) {
    return (
      <div className="pf__sleeve" key={kind}>
        <h3 className="pf__sleeve-h">{LOT_KIND_LABEL[kind]}</h3>
        <BookTable
          showActions={canWrite}
          displayCurrency={displayCurrency}
          fxUsdInr={fx}
          emptyCopy={
            kind === "esop"
              ? "No ESOP lots yet."
              : "No retail lots yet. Add a name or upload a CSV."
          }
          caption={
            kind === "esop"
              ? "ESOP lots only. Unrealized P&L % uses previous close (not written to lots)."
              : "Retail lots only. Unrealized P&L % uses previous close (not written to lots)."
          }
          rows={rows.map((h) => ({
            key: rowKey(h),
            stock: h.company_name ?? h.ticker,
            ticker: h.ticker,
            qty: h.qty,
            costPerShare: h.cost_per_share,
            currency: h.native_currency,
            quote: quotes[h.ticker] ?? null,
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
                        `Remove ${h.ticker} (${LOT_KIND_LABEL[h.lot_kind]}) from your book? Saved notes stay.`,
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
                  <input type="hidden" name="orig_lot_kind" value={h.lot_kind} />
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

  return (
    <div className="desk__card">
      <h2>Your book</h2>
      {!lotKindColumnPresent ? (
        <p className="pf__lede">
          Retail vs ESOP is not stored yet. Every name shows under Retail until
          an operator applies migration 028. Forms still accept the control.
        </p>
      ) : null}
      <p className="pf__sleeve-totals">
        Overall unrealized P&amp;L % {formatPnlPct(overallPct)}
        {" · "}
        Retail {formatPnlPct(retailPct)}
        {" · "}
        ESOP {formatPnlPct(esopPct)}
      </p>
      {canWrite && editing ? (
        <form
          key={rowKey(editing)}
          className="pf__stack"
          action={editAction}
          style={{ marginTop: 14 }}
        >
          <input type="hidden" name="returnTo" value="/portfolio" />
          <input type="hidden" name="orig_ticker" value={editing.ticker} />
          <input type="hidden" name="orig_exchange" value={editing.exchange} />
          <input type="hidden" name="orig_native" value={editing.native_currency} />
          <input type="hidden" name="orig_lot_kind" value={editing.lot_kind} />
          <p className="pf__card-title">
            Edit {editing.ticker} ({LOT_KIND_LABEL[editing.lot_kind]})
          </p>
          <div className="pf__row">
            <div className="pf__field">
              <label className="pf__label" htmlFor="edit-ticker">
                Ticker
              </label>
              <input
                id="edit-ticker"
                className="pf__input"
                name="ticker"
                defaultValue={editing.ticker}
                autoCapitalize="characters"
                required
              />
            </div>
            <div className="pf__field">
              <label className="pf__label" htmlFor="edit-company">
                Company name
              </label>
              <input
                id="edit-company"
                className="pf__input"
                name="company_name"
                defaultValue={editing.company_name ?? ""}
                placeholder="e.g. Microsoft"
              />
            </div>
          </div>
          <div className="pf__row">
            <div className="pf__field">
              <label className="pf__label" htmlFor="edit-qty">
                Qty
              </label>
              <input
                id="edit-qty"
                className="pf__input"
                name="qty"
                defaultValue={String(editing.qty)}
                placeholder="e.g. 10"
                inputMode="decimal"
                required
              />
            </div>
            <div className="pf__field">
              <label className="pf__label" htmlFor="edit-cost">
                Cost / share
              </label>
              <input
                id="edit-cost"
                className="pf__input"
                name="cost_per_share"
                defaultValue={String(editing.cost_per_share)}
                placeholder="e.g. 400"
                inputMode="decimal"
                required
              />
            </div>
            <div className="pf__field">
              <label className="pf__label" htmlFor="edit-currency">
                Currency
              </label>
              <select
                id="edit-currency"
                className="pf__input"
                name="currency"
                defaultValue={editing.native_currency}
              >
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>
          <LotKindFields defaultValue={editing.lot_kind} />
          <div className="pf__row">
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
      {tableFor("retail", retail)}
      {tableFor("esop", esop)}
    </div>
  );
}
