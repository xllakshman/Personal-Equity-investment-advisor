import {
  formatNoteDate,
  keyFacts,
  looksNumericCell,
  machineFrom,
  machineTables,
  priceComparisonChart,
  typesetProse,
} from "@/lib/reports/typeset";
import { isFinishedNote, noteDocument } from "@/lib/reports/sections";
import { parseCharts } from "@/lib/reports/charts";
import type { EvidenceRow } from "@/lib/reports/load";
import {
  coverageFromSections,
  filerTypeFromSections,
  parseIntegrityWarnings,
} from "@/lib/reports/integrity";
import { ReportCharts } from "@/components/features/report/ReportCharts";

function NoteTable({
  title,
  headers,
  rows,
  kv = false,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  kv?: boolean;
}) {
  const shownHeaders = headers.filter((h) => h.trim());
  return (
    <section className="note-doc__section" aria-label={title}>
      <p className="note-doc__caption">{title}</p>
      <div className="note-doc__table-wrap">
        <table className={kv ? "note-doc__table note-doc__table--kv" : "note-doc__table"}>
          {!kv && shownHeaders.length > 0 ? (
            <thead>
              <tr>
                {shownHeaders.map((h, i) => (
                  <th key={i} className={looksNumericCell(h) ? "note-doc__num" : undefined}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const numeric = looksNumericCell(cell);
                  if (kv && ci === 0) {
                    return (
                      <th key={ci} scope="row">
                        {cell}
                      </th>
                    );
                  }
                  return (
                    <td key={ci} className={numeric ? "note-doc__num" : undefined}>
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ReportDocument({
  name,
  ticker,
  verdict,
  conviction,
  createdAt,
  modelLabel,
  sections,
  charts,
  evidence,
}: {
  name: string;
  ticker: string;
  verdict: string;
  conviction?: string | null;
  createdAt?: string | null;
  modelLabel?: string | null;
  sections: Record<string, unknown>;
  charts?: unknown;
  evidence?: EvidenceRow[];
}) {
  const finished = isFinishedNote(sections);
  const prose = noteDocument(sections);
  const blocks = typesetProse(prose);
  const excerpt = evidence?.[0]?.excerpt ?? null;
  const machine = machineFrom(sections);
  const facts = keyFacts({
    ticker,
    verdict,
    conviction,
    createdAt,
    modelLabel,
    evidenceExcerpt: excerpt,
    machine,
    filerType: filerTypeFromSections(sections),
    coverage: coverageFromSections(sections),
  });
  const tables = machineTables(machine);
  const stored = parseCharts(charts);
  const derived = priceComparisonChart(machine, excerpt);
  const usable = stored.charts.filter((chart) =>
    chart.type === "table" ? chart.rows.length > 0 : chart.labels.length > 0,
  );
  const shown = usable.length > 0 ? usable : derived ? [derived] : [];
  const warnings = parseIntegrityWarnings(sections);

  if (!finished) {
    return (
      <p className="pf__lede">
        This note is not finished yet. Stay on the wait page until it shows ready.
      </p>
    );
  }

  return (
    <article className="note-doc">
      <header className="note-doc__cover">
        <p className="note-doc__kicker">Equity note</p>
        <h1 className="note-doc__title">{name || `${ticker} — ${verdict}`}</h1>
        <p className="note-doc__sub">
          {ticker} · {verdict}
          {createdAt ? ` · ${formatNoteDate(createdAt)}` : ""}
        </p>
      </header>
      {facts.length > 0 ? (
        <NoteTable
          title="Key data"
          headers={[]}
          rows={facts.map((f) => [f.label, f.value])}
          kv
        />
      ) : null}
      {tables.map((table, i) => (
        <NoteTable
          key={`${table.kind}-${table.title}-${i}`}
          title={table.title}
          headers={table.headers}
          rows={table.rows}
        />
      ))}
      {warnings.length > 0 ? (
        <details className="note-doc__integrity">
          <summary>Numbers to double-check</summary>
          <ul>
            {warnings.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <ReportCharts charts={shown} dropped={stored.dropped} />
      <div className="note-doc__body">
        {blocks.map((block, i) => {
          if (block.kind === "rule") return <hr key={i} className="note-doc__rule" />;
          if (block.kind === "h1") return <h2 key={i}>{block.text}</h2>;
          if (block.kind === "h2") return <h2 key={i}>{block.text}</h2>;
          return <p key={i}>{block.text}</p>;
        })}
      </div>
      {evidence && evidence.length > 0 ? (
        <section className="note-doc__evidence">
          <p className="note-doc__caption">What we checked</p>
          <div className="note-doc__table-wrap">
            <table className="note-doc__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Query</th>
                  <th>Excerpt</th>
                </tr>
              </thead>
              <tbody>
                {evidence.map((row) => (
                  <tr key={row.step0Number}>
                    <td className="note-doc__num">{row.step0Number}</td>
                    <td>{row.query ?? "—"}</td>
                    <td>{row.excerpt ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </article>
  );
}
