"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PdfOpenButton } from "@/components/features/report/PdfOpenButton";
import {
  inReportPeriod,
  isStaleNote,
  matchesCompany,
  monthKey,
  monthLabel,
  noteDateLabel,
  relativeAge,
  STALE_COPY,
  verdictTone,
  weekKey,
  weekLabel,
  type ReportGroupBy,
  type ReportPeriod,
} from "@/lib/reports/age";
import type { DeskNoteRow } from "@/lib/reports/load";

function agentLabel(row: DeskNoteRow): string {
  if (row.kind === "in_progress") return "In progress";
  const id = row.modelId.toLowerCase();
  if (/gpt|claude|grok|o3|sonnet|opus|frontier/.test(id)) return "Frontier agent";
  return "Basic agent";
}

function shortVerdict(text: string): string {
  const t = text.trim();
  if (!t) return "—";
  return t.length > 28 ? `${t.slice(0, 28)}…` : t;
}

export function ReportsDeskView({ rows }: { rows: DeskNoteRow[] }) {
  const [groupBy, setGroupBy] = useState<ReportGroupBy>("week");
  const [period, setPeriod] = useState<ReportPeriod>("all");
  const [month, setMonth] = useState("");
  const [week, setWeek] = useState("");
  const [company, setCompany] = useState("");

  const own = rows.filter((r) => !r.isLibrarySample);
  const samples = rows.filter((r) => r.isLibrarySample);
  const months = useMemo(
    () => [...new Set(own.map((r) => monthKey(r.lastRun)).filter(Boolean))].sort().reverse(),
    [own],
  );
  const weeks = useMemo(
    () => [...new Set(own.map((r) => weekKey(r.lastRun)))].sort().reverse(),
    [own],
  );

  const filtered = own.filter((r) => {
    if (!inReportPeriod(r.lastRun, period)) return false;
    if (month && monthKey(r.lastRun) !== month) return false;
    if (week && weekKey(r.lastRun) !== week) return false;
    if (!matchesCompany({ ticker: r.ticker, name: r.name }, company)) return false;
    return true;
  });

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: DeskNoteRow[] }>();
    for (const r of filtered) {
      const key = groupBy === "month" ? monthKey(r.lastRun) : weekKey(r.lastRun);
      const label = groupBy === "month" ? monthLabel(key) : weekLabel(r.lastRun);
      const g = map.get(key) ?? { key, label, items: [] };
      g.items.push(r);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [filtered, groupBy]);

  const staleCount = own.filter((r) => r.kind === "note" && isStaleNote(r.lastRun)).length;

  return (
    <div className="desk__screen">
      <p className="desk__kicker">Reports</p>
      <h1 className="desk__h1">Your saved notes</h1>
      <p className="desk__lede" style={{ marginBottom: 22, maxWidth: "64ch" }}>
        {STALE_COPY}
      </p>
      <div className="rpt__filters">
        <div className="rpt__search-row">
          <input
            className="rpt__search"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Filter by company or ticker"
          />
          <button
            type="button"
            className={groupBy === "week" ? "rpt__chip rpt__chip--on" : "rpt__chip"}
            onClick={() => setGroupBy("week")}
          >
            By week
          </button>
          <button
            type="button"
            className={groupBy === "month" ? "rpt__chip rpt__chip--on" : "rpt__chip"}
            onClick={() => setGroupBy("month")}
          >
            By month
          </button>
        </div>
        <div className="rpt__row">
          <span className="rpt__row-k">Month</span>
          <button
            type="button"
            className={!month && period !== "month" ? "rpt__chip rpt__chip--on" : "rpt__chip"}
            onClick={() => {
              setMonth("");
              setPeriod("all");
            }}
          >
            All months
          </button>
          {months.map((m) => (
            <button
              key={m}
              type="button"
              className={month === m ? "rpt__chip rpt__chip--on" : "rpt__chip"}
              onClick={() => {
                setMonth(m);
                setPeriod("all");
              }}
            >
              {monthLabel(m)}
            </button>
          ))}
        </div>
        <div className="rpt__row">
          <span className="rpt__row-k">Week</span>
          <button
            type="button"
            className={!week && period !== "week" ? "rpt__chip rpt__chip--on" : "rpt__chip"}
            onClick={() => {
              setWeek("");
              setPeriod("all");
            }}
          >
            All weeks
          </button>
          <button
            type="button"
            className={period === "week" && !week ? "rpt__chip rpt__chip--on" : "rpt__chip"}
            onClick={() => {
              setWeek("");
              setPeriod("week");
            }}
          >
            This week
          </button>
          {weeks.map((w) => (
            <button
              key={w}
              type="button"
              className={week === w ? "rpt__chip rpt__chip--on" : "rpt__chip"}
              onClick={() => {
                setWeek(w);
                setPeriod("all");
              }}
            >
              {weekLabel(`${w}T00:00:00.000Z`)}
            </button>
          ))}
        </div>
      </div>
      <p className="rpt__summary">
        Showing {filtered.length} of {own.length} notes
        {staleCount > 0 ? ` · ${staleCount} older than 60 days` : ""}
      </p>
      {rows.length === 0 ? (
        <p className="pf__empty" style={{ marginTop: 8 }}>
          No saved notes yet.
        </p>
      ) : filtered.length === 0 ? (
        <p className="pf__empty">No notes match these filters.</p>
      ) : (
        groups.map((g) => (
          <section className="rpt__group" key={g.key}>
            <div className="rpt__group-h">
              <h2>{g.label}</h2>
              <span>
                {g.items.length} note{g.items.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="rpt__grid">
              {g.items.map((r) => {
                const stale = r.kind === "note" && isStaleNote(r.lastRun);
                const tone = verdictTone(r.verdict);
                return (
                  <article className="rpt__card" key={`${r.kind}-${r.id}`}>
                    <div className="rpt__card-top">
                      <span className="rpt__card-meta">
                        {r.ticker} · {noteDateLabel(r.lastRun)}
                      </span>
                      <span className={`rpt__verdict rpt__verdict--${tone}`}>
                        {shortVerdict(r.verdict)}
                      </span>
                    </div>
                    <Link className="rpt__card-name" href={r.href}>
                      {r.name}
                    </Link>
                    {stale ? (
                      <div className="rpt__outdated">
                        <span className="bld__intent-dot" aria-hidden />
                        <p>
                          <strong>Outdated · {relativeAge(r.lastRun)}.</strong> Run a
                          fresh analysis before acting on this.
                        </p>
                      </div>
                    ) : null}
                    <div className="rpt__card-foot">
                      <span>
                        {agentLabel(r)} · {relativeAge(r.lastRun)}
                      </span>
                      <div className="rpt__card-actions">
                        {stale ? (
                          <Link
                            href={`/analyse?ticker=${encodeURIComponent(r.ticker)}`}
                            className="rpt__fresh"
                          >
                            Run fresh analysis
                          </Link>
                        ) : null}
                        {r.kind === "note" ? (
                          <PdfOpenButton reportId={r.id} ready={Boolean(r.pdfKey)} />
                        ) : (
                          <Link href={r.href} className="rpt__pdf">
                            Open wait page
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
      {samples.length > 0 ? (
        <>
          <div className="rpt__group-h">
            <h2>Free samples</h2>
            <span>Read-only, never count against your plan</span>
          </div>
          <div className="rpt__grid">
            {samples.map((r) => (
              <article className="rpt__card" key={r.id}>
                <div className="rpt__card-top">
                  <span className="rpt__card-meta">Sample</span>
                  <span className={`rpt__verdict rpt__verdict--${verdictTone(r.verdict)}`}>
                    {shortVerdict(r.verdict)}
                  </span>
                </div>
                <Link className="rpt__card-name" href={r.href}>
                  {r.name}
                </Link>
                <div className="rpt__card-foot">
                  <span>{agentLabel(r)}</span>
                  <Link href={r.href} className="rpt__pdf">
                    Read
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
