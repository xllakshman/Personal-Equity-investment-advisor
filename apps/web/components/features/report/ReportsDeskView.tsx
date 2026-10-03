"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  inReportPeriod,
  isStaleNote,
  matchesCompany,
  monthKey,
  STALE_COPY,
  type ReportPeriod,
} from "@/lib/reports/age";
import type { DeskNoteRow } from "@/lib/reports/load";
import { moneyCents } from "@/lib/reports/sections";
import { versionLabel } from "@/lib/reports/versions";

function shortVerdict(text: string): string {
  const t = text.trim();
  if (!t) return "—";
  return t.length > 72 ? `${t.slice(0, 72)}…` : t;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function ReportsDeskView({ rows }: { rows: DeskNoteRow[] }) {
  const [period, setPeriod] = useState<ReportPeriod>("all");
  const [month, setMonth] = useState("");
  const [company, setCompany] = useState("");

  const companies = useMemo(
    () => [...new Set(rows.map((r) => r.ticker))].sort(),
    [rows],
  );
  const months = useMemo(
    () => [...new Set(rows.map((r) => monthKey(r.lastRun)).filter(Boolean))].sort().reverse(),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (!inReportPeriod(r.lastRun, period)) return false;
    if (month && monthKey(r.lastRun) !== month) return false;
    if (!matchesCompany({ ticker: r.ticker, name: r.name }, company)) return false;
    return true;
  });

  return (
    <div>
      <h1 className="desk__h1">Reports</h1>
      <p className="desk__lede">
        Saved research for this book, newest first. Runs still in the queue show as
        In progress. Notes older than 30 days are marked as possibly obsolete.
      </p>
      {rows.length === 0 ? (
        <p className="pf__empty" style={{ marginTop: 22 }}>
          No saved notes yet.
        </p>
      ) : (
        <>
          <div className="rpt__filters" style={{ marginTop: 22 }}>
            <label className="pf__label">
              Week
              <select
                className="pf__input"
                value={period === "week" ? "week" : "all"}
                onChange={(e) =>
                  setPeriod(e.target.value === "week" ? "week" : "all")
                }
              >
                <option value="all">All weeks</option>
                <option value="week">This week</option>
              </select>
            </label>
            <label className="pf__label">
              Month
              <select
                className="pf__input"
                value={period === "month" && !month ? "this" : month}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "this") {
                    setMonth("");
                    setPeriod("month");
                    return;
                  }
                  if (v === "") {
                    setMonth("");
                    if (period === "month") setPeriod("all");
                    return;
                  }
                  setMonth(v);
                  setPeriod("all");
                }}
              >
                <option value="">All months</option>
                <option value="this">This month</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="pf__label">
              Company
              <select
                className="pf__input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              >
                <option value="">All companies</option>
                {companies.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
                    <th>Version</th>
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
                      <td colSpan={7} className="pf__empty">
                        No notes match these filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const stale = r.kind === "note" && isStaleNote(r.lastRun);
                      return (
                        <tr key={`${r.kind}-${r.id}`}>
                          <td className="pf__ticker">{r.ticker}</td>
                          <td className="pf__muted">
                            {versionLabel(r.version, r.versionCount)}
                          </td>
                          <td className="pf__muted">{dayKey(r.lastRun)}</td>
                          <td>
                            <Link href={r.href}>{r.name}</Link>
                            {r.isLibrarySample ? (
                              <span className="pf__muted"> · sample</span>
                            ) : null}
                            {stale ? (
                              <p className="rpt__stale">{STALE_COPY}</p>
                            ) : null}
                          </td>
                          <td>{shortVerdict(r.verdict)}</td>
                          <td>{stale ? "Possibly obsolete" : r.status}</td>
                          <td>
                            {r.costCents == null ? "—" : moneyCents(r.costCents)}
                          </td>
                        </tr>
                      );
                    })
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
