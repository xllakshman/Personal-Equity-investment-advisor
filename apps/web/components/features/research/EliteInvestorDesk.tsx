"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { pctLabel } from "@/lib/research/cagr";
import { ELITE_INVESTORS } from "@/lib/research/elite-catalog";
import type { EliteInvestorBook, EliteSnapshot } from "@/lib/research/elite-types";
import { emptySnapshot } from "@/lib/research/elite-types";
import {
  eliteAccent,
  overlapCopy,
  topHoldingChips,
} from "@/lib/research/holding-chips";

function usd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function shares(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function EliteInvestorDesk({
  initial,
  heldTickers = [],
}: {
  initial: EliteSnapshot;
  heldTickers?: string[];
}) {
  const [snap, setSnap] = useState<EliteSnapshot>(initial ?? emptySnapshot());
  const [open, setOpen] = useState<string | null>(ELITE_INVESTORS[0]?.slug ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const bySlug = useMemo(() => {
    const m = new Map(snap.investors.map((b) => [b.slug, b]));
    return m;
  }, [snap]);

  async function refreshOne(slug: string) {
    setBusy(slug);
    setBanner(null);
    try {
      const res = await fetch(`/api/elite-investors/refresh?slug=${encodeURIComponent(slug)}`, {
        method: "POST",
      });
      const body = (await res.json()) as {
        book?: EliteInvestorBook;
        error?: string;
      };
      if (!res.ok || !body.book) {
        setBanner(body.error || "Could not refresh that book just now.");
        return;
      }
      setSnap((prev) => ({
        generatedAt: body.book!.refreshedAt,
        investors: prev.investors.map((row) => (row.slug === slug ? body.book! : row)),
      }));
      setOpen(slug);
    } catch {
      setBanner("Could not refresh that book just now.");
    } finally {
      setBusy(null);
    }
  }

  async function refreshVisible() {
    for (const row of ELITE_INVESTORS) {
      await refreshOne(row.slug);
    }
  }

  return (
    <div>
      <div className="elite__toolbar">
        <p className="pf__lede" style={{ margin: 0 }}>
          Holdings are the latest public 13F on SEC EDGAR (often ~45 days late).
          1 / 3 / 5 / 10 year figures are the listed vehicle’s total return from
          Yahoo Finance when a public share class exists — not hedge-fund NAV.
          This page does not refresh on load.
        </p>
        <button
          type="button"
          className="desk__btn"
          disabled={busy != null}
          onClick={() => void refreshVisible()}
        >
          {busy ? "Refreshing…" : "Refresh all books"}
        </button>
      </div>
      {snap.generatedAt ? (
        <p className="pf__muted" style={{ marginTop: 8 }}>
          Last refresh in this session: {snap.generatedAt.slice(0, 16).replace("T", " ")} UTC
        </p>
      ) : (
        <p className="pf__muted" style={{ marginTop: 8 }}>
          No 13F pulled yet. Open a name and click Refresh this book.
        </p>
      )}
      {banner ? <p className="pf__error">{banner}</p> : null}
      <ul className="elite__list">
        {ELITE_INVESTORS.map((row, i) => {
          const book = bySlug.get(row.slug);
          const isOpen = open === row.slug;
          const top = (book?.holdings ?? []).slice(0, 15);
          const rest = Math.max(0, (book?.holdings.length ?? 0) - top.length);
          const chips = topHoldingChips(book?.holdings ?? [], heldTickers);
          const accent = eliteAccent(i);
          return (
            <li
              key={row.slug}
              className="desk__card elite__card"
              style={{ ["--elite-accent" as string]: accent }}
            >
              <button
                type="button"
                className="elite__head"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : row.slug)}
              >
                <span className="elite__n">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="elite__name">{row.name}</span>
                  <span className="elite__firm">{row.firm}</span>
                </span>
                <span className="elite__ret">
                  <span>1y {pctLabel(book?.returns.y1 ?? null)}</span>
                  <span>3y {pctLabel(book?.returns.y3 ?? null)}</span>
                  <span>5y {pctLabel(book?.returns.y5 ?? null)}</span>
                  <span>10y {pctLabel(book?.returns.y10 ?? null)}</span>
                </span>
              </button>
              <div className="elite__hold">
                <p className="elite__hold-k">Top five holdings</p>
                {chips.length === 0 ? (
                  <p className="pf__muted" style={{ margin: 0 }}>
                    Refresh this book to see holdings.
                  </p>
                ) : (
                  <div className="elite__chips">
                    {chips.map((chip) =>
                      chip.ticker ? (
                        <Link
                          key={`${row.slug}-${chip.label}`}
                          href={`/analyse?ticker=${encodeURIComponent(chip.ticker)}`}
                          className={
                            chip.overlap ? "elite__chip elite__chip--mine" : "elite__chip"
                          }
                        >
                          {chip.label}
                        </Link>
                      ) : (
                        <span
                          key={`${row.slug}-${chip.label}`}
                          className="elite__chip"
                        >
                          {chip.label}
                        </span>
                      ),
                    )}
                  </div>
                )}
                <p className="elite__overlap">{overlapCopy(chips)}</p>
              </div>
              {isOpen ? (
                <div className="elite__body">
                  <p className="pf__lede">{row.vehicleNote}</p>
                  <p className="pf__muted">
                    13F as of {book?.filingAsOf ?? "—"}
                    {book?.filingUrl ? (
                      <>
                        {" "}
                        ·{" "}
                        <a href={book.filingUrl} target="_blank" rel="noreferrer">
                          Filing on SEC
                        </a>
                      </>
                    ) : null}
                    {book?.refreshedAt
                      ? ` · refreshed ${book.refreshedAt.slice(0, 10)}`
                      : " · not refreshed yet"}
                  </p>
                  <div className="elite__rets">
                    <div>
                      <p className="desk__kicker">1 year</p>
                      <p className="elite__pct">{pctLabel(book?.returns.y1 ?? null)}</p>
                    </div>
                    <div>
                      <p className="desk__kicker">3 year ann.</p>
                      <p className="elite__pct">{pctLabel(book?.returns.y3 ?? null)}</p>
                    </div>
                    <div>
                      <p className="desk__kicker">5 year ann.</p>
                      <p className="elite__pct">{pctLabel(book?.returns.y5 ?? null)}</p>
                    </div>
                    <div>
                      <p className="desk__kicker">10 year ann.</p>
                      <p className="elite__pct">{pctLabel(book?.returns.y10 ?? null)}</p>
                    </div>
                  </div>
                  <p className="pf__muted">
                    {book?.returns.vehicleTicker
                      ? `Vehicle ${book.returns.vehicleTicker}${book.returns.asOf ? ` · prices through ${book.returns.asOf}` : ""}`
                      : "No public share class — return cells stay — until a listed vehicle exists."}
                  </p>
                  <button
                    type="button"
                    className="desk__btn"
                    disabled={busy != null}
                    onClick={() => void refreshOne(row.slug)}
                  >
                    {busy === row.slug ? "Refreshing…" : "Refresh this book"}
                  </button>
                  {book?.error ? <p className="pf__error">{book.error}</p> : null}
                  {book?.holdingsNote ? <p className="pf__lede">{book.holdingsNote}</p> : null}
                  {top.length === 0 ? (
                    <p className="pf__empty">No holdings in cache. Refresh this book.</p>
                  ) : (
                    <div className="pf__table-wrap" style={{ marginTop: 12 }}>
                      <table className="pf__table">
                        <thead>
                          <tr>
                            <th>Invested company</th>
                            <th>% of 13F</th>
                            <th>Value</th>
                            <th>Shares</th>
                            <th>Ticker</th>
                            <th>CUSIP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top.map((h) => (
                            <tr key={`${h.cusip}-${h.issuer}`}>
                              <td>
                                {h.issuer}
                                {h.titleOfClass ? (
                                  <span className="pf__muted"> · {h.titleOfClass}</span>
                                ) : null}
                              </td>
                              <td>{h.weightPct.toFixed(1)}%</td>
                              <td>{usd(h.valueUsd)}</td>
                              <td>{shares(h.shares)}</td>
                              <td>
                                {h.ticker ? (
                                  <Link href={`/analyse?ticker=${encodeURIComponent(h.ticker)}`}>
                                    {h.ticker}
                                  </Link>
                                ) : (
                                  <span className="pf__muted">—</span>
                                )}
                              </td>
                              <td className="pf__muted">{h.cusip || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {rest > 0 ? (
                        <p className="pf__muted">{rest} smaller line(s) omitted.</p>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
