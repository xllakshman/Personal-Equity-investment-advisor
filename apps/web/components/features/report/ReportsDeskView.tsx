"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { DeskNoteRow } from "@/lib/reports/load";
import { moneyCents } from "@/lib/reports/sections";

function shortVerdict(text: string): string {
  const t = text.trim();
  if (!t) return "—";
  return t.length > 72 ? `${t.slice(0, 72)}…` : t;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function ReportsDeskView({ rows }: { rows: DeskNoteRow[] }) {
  const [ticker, setTicker] = useState("");
  const [from, setFrom] = useState("");
  const [verdict, setVerdict] = useState("");

  const tickers = useMemo(
    () => [...new Set(rows.map((r) => r.ticker))].sort(),
    [rows],
  );
  const verdicts = useMemo(
    () => [...new Set(rows.filter((r) => r.verdict).map((r) => r.verdict))].sort(),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (ticker && r.ticker !== ticker) return false;
    if (from && dayKey(r.lastRun) < from) return false;
    if (verdict && r.verdict !== verdict) return false;
    return true;
  });

  return (
    <div>
      <h1 className="desk__h1">Reports</h1>
      <p className="desk__lede">
        Saved notes for this book, newest first. Runs still in the queue show as In
        progress.
      </p>
      {rows.length === 0 ? (
        <p className="pf__empty" style={{ marginTop: 22 }}>
          No saved notes yet.
        </p>
      ) : (
        <>
          <div className="rpt__filters" style={{ marginTop: 22 }}>
            <label className="pf__label">
              Ticker
              <select
                className="pf__input"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
              >
                <option value="">All</option>
                {tickers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="pf__label">
              From date
              <input
                className="pf__input"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="pf__label">
              Verdict
              <select
                className="pf__input"
                value={verdict}
                onChange={(e) => setVerdict(e.target.value)}
              >
                <option value="">All</option>
                {verdicts.map((v) => (
                  <option key={v} value={v}>
                    {shortVerdict(v)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="pf__table-wrap">
            <div className="pf__scroll">
              <table className="pf__table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Last run</th>
                    <th>Note</th>
                    <th>Verdict</th>
                    <th>Status</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="pf__empty">
                        No notes match these filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={`${r.kind}-${r.id}`}>
                        <td className="pf__ticker">{r.ticker}</td>
                        <td className="pf__muted">{dayKey(r.lastRun)}</td>
                        <td>
                          <Link href={r.href} style={{ color: "#0b5fcc" }}>
                            {r.name}
                          </Link>
                          {r.isLibrarySample ? (
                            <span className="pf__muted"> · sample</span>
                          ) : null}
                        </td>
                        <td>{shortVerdict(r.verdict)}</td>
                        <td>{r.status}</td>
                        <td>
                          {r.costCents == null ? "—" : moneyCents(r.costCents)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
