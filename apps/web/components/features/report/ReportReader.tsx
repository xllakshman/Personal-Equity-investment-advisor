"use client";

import { useMemo, useState } from "react";

import { parseCharts } from "@/lib/reports/charts";
import {
  pickSection,
  sectionText,
  visibleSectionKeys,
  type ReportTab,
  TAB_KEYS,
} from "@/lib/reports/sections";
import type { EvidenceRow, RefineRow, ReportDetail } from "@/lib/reports/load";
import { ExpertToggle } from "@/components/features/report/ExpertToggle";
import { FeedbackForm } from "@/components/features/report/FeedbackForm";
import { PdfDownloadButton, RenameForm } from "@/components/features/report/ReportActions";
import { RefinePanel } from "@/components/features/report/RefinePanel";
import { ReportCharts } from "@/components/features/report/ReportCharts";

const TAB_LABEL: Record<ReportTab, string> = {
  verdict: "Verdict",
  evidence: "Evidence",
  moat: "Moat",
  execution: "Execution",
  scenarios: "Scenarios",
  tax: "Tax",
  news: "News",
  refine: "Refine",
};

export function ReportReader({
  report,
  evidence,
  refinements,
  feedbackSubmitted,
  canWrite,
}: {
  report: ReportDetail;
  evidence: EvidenceRow[];
  refinements: RefineRow[];
  feedbackSubmitted: boolean;
  canWrite: boolean;
}) {
  const [tab, setTab] = useState<ReportTab>("verdict");
  const [expert, setExpert] = useState(false);
  const { charts, dropped } = useMemo(() => parseCharts(report.charts), [report.charts]);
  const visible = visibleSectionKeys(report.sections, expert);

  return (
    <div>
      <p className="desk__kicker">{report.ticker}</p>
      <h1 className="desk__h1">{report.name}</h1>
      <p className="desk__lede">
        Verdict {report.verdict}
        {report.conviction ? ` · ${report.conviction}` : ""} · {report.modelId} · cost{" "}
        {report.tokenCostCents === 0 && report.isLibrarySample
          ? "$0.00 sample"
          : `$${(report.tokenCostCents / 100).toFixed(2)}`}
        {report.isLibrarySample ? " · library sample (no refine)" : ""}
      </p>
      <div className="pf__row" style={{ marginTop: 16, gap: 16, flexWrap: "wrap" }}>
        <ExpertToggle expert={expert} onChange={setExpert} />
        <RenameForm reportId={report.id} currentName={report.name} />
        <PdfDownloadButton reportId={report.id} ready={Boolean(report.pdfKey)} />
      </div>
      <div className="report__tabs" role="tablist">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "report__tab report__tab--on" : "report__tab"}
            onClick={() => setTab(key)}
          >
            {TAB_LABEL[key]}
          </button>
        ))}
      </div>
      <div className="desk__card" style={{ marginTop: 16 }}>
        {tab === "verdict" ? (
          <pre className="report__pre">
            {sectionText(pickSection(report.sections, ["verdict"])) || report.verdict}
          </pre>
        ) : null}
        {tab === "evidence" ? (
          evidence.length === 0 ? (
            <pre className="report__pre">
              {sectionText(
                pickSection(report.sections, ["step0", "evidence"]),
              ) || "No analysis_evidence rows yet. Seed notes use stub sections jsonb."}
            </pre>
          ) : (
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
          )
        ) : null}
        {tab === "moat" ? (
          <pre className="report__pre">
            {sectionText(pickSection(report.sections, ["moat"])) || "—"}
          </pre>
        ) : null}
        {tab === "execution" ? (
          <pre className="report__pre">
            {sectionText(
              pickSection(report.sections, ["execution", "sizing", "tranches"]),
            ) || "—"}
          </pre>
        ) : null}
        {tab === "scenarios" ? (
          <pre className="report__pre">
            {sectionText(pickSection(report.sections, ["scenarios"])) || "—"}
          </pre>
        ) : null}
        {tab === "tax" ? (
          <pre className="report__pre">
            {sectionText(pickSection(report.sections, ["tax"])) || "—"}
          </pre>
        ) : null}
        {tab === "news" ? (
          <pre className="report__pre">
            {sectionText(pickSection(report.sections, ["news"])) || "—"}
          </pre>
        ) : null}
        {tab === "refine" ? (
          <RefinePanel
            reportId={report.id}
            isSample={report.isLibrarySample}
            canWrite={canWrite}
            refinements={refinements}
          />
        ) : null}
        {expert && tab !== "refine" ? (
          <div style={{ marginTop: 18 }}>
            <h2>Expert keys</h2>
            {visible
              .filter((k) => !["verdict", "step0", "evidence", "moat", "news", "tax"].includes(k))
              .map((k) => (
                <div key={k} style={{ marginTop: 10 }}>
                  <p className="desk__kpi-k">{k}</p>
                  <pre className="report__pre">{sectionText(report.sections[k])}</pre>
                </div>
              ))}
          </div>
        ) : null}
      </div>
      <ReportCharts charts={charts} dropped={dropped} />
      {!report.isLibrarySample ? (
        <FeedbackForm reportId={report.id} alreadySubmitted={feedbackSubmitted} canWrite={canWrite} />
      ) : (
        <p className="desk__lede">Library sample — no satisfaction form.</p>
      )}
    </div>
  );
}
