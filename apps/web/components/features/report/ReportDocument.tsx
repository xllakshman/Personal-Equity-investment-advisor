import { keyFacts, typesetProse } from "@/lib/reports/typeset";
import { isFinishedNote, noteDocument } from "@/lib/reports/sections";
import { parseCharts } from "@/lib/reports/charts";
import type { EvidenceRow } from "@/lib/reports/load";
import { ReportCharts } from "@/components/features/report/ReportCharts";

function machineFrom(sections: Record<string, unknown>): Record<string, unknown> | null {
  const raw = sections.machine;
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
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
  const facts = keyFacts({
    ticker,
    verdict,
    conviction,
    createdAt,
    modelLabel,
    evidenceExcerpt: excerpt,
    machine: machineFrom(sections),
  });
  const parsed = parseCharts(charts);

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
          {createdAt
            ? ` · ${new Date(createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}`
            : ""}
        </p>
      </header>
      {facts.length > 0 ? (
        <section className="note-doc__kpis" aria-label="Key data">
          {facts.map((f) => (
            <div className="note-doc__kpi" key={f.label}>
              <p className="note-doc__kpi-k">{f.label}</p>
              <p className="note-doc__kpi-v">{f.value}</p>
            </div>
          ))}
        </section>
      ) : null}
      <div className="note-doc__body">
        {blocks.map((block, i) => {
          if (block.kind === "rule") return <hr key={i} className="note-doc__rule" />;
          if (block.kind === "h1") return <h2 key={i}>{block.text}</h2>;
          if (block.kind === "h2") return <h3 key={i}>{block.text}</h3>;
          return <p key={i}>{block.text}</p>;
        })}
      </div>
      {evidence && evidence.length > 0 ? (
        <section className="note-doc__evidence">
          <h3>What we checked</h3>
          <table className="pf__table">
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
                  <td>{row.step0Number}</td>
                  <td>{row.query ?? "—"}</td>
                  <td className="pf__muted">{row.excerpt ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      <ReportCharts charts={parsed.charts} dropped={parsed.dropped} />
    </article>
  );
}
