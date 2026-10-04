"use client";

import { isStaleNote, STALE_COPY } from "@/lib/reports/age";
import type { EvidenceRow, RefineRow, ReportDetail } from "@/lib/reports/load";
import { FeedbackForm } from "@/components/features/report/FeedbackForm";
import { PdfDownloadButton, RenameForm } from "@/components/features/report/ReportActions";
import { RefinePanel } from "@/components/features/report/RefinePanel";
import { ReportDocument } from "@/components/features/report/ReportDocument";

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
  return (
    <div>
      <div className="note-doc__toolbar">
        <PdfDownloadButton reportId={report.id} ready={Boolean(report.pdfKey)} />
        {canWrite ? (
          <RenameForm reportId={report.id} currentName={report.name} />
        ) : null}
      </div>
      {isStaleNote(report.createdAt) ? (
        <p className="pf__banner" style={{ marginTop: 12 }}>
          {STALE_COPY}
        </p>
      ) : null}
      <ReportDocument
        name={report.name}
        ticker={report.ticker}
        verdict={report.verdict}
        conviction={report.conviction}
        createdAt={report.createdAt}
        sections={report.sections}
        charts={report.charts}
        evidence={evidence}
      />
      <div className="note-doc__follow">
        <h2>Follow-up on this note</h2>
        <p className="desk__lede">
          Adds a new reply under this note. The original verdict stays as written.
        </p>
        <RefinePanel
          reportId={report.id}
          isSample={report.isLibrarySample}
          canWrite={canWrite}
          refinements={refinements}
        />
      </div>
      {!report.isLibrarySample ? (
        <FeedbackForm reportId={report.id} alreadySubmitted={feedbackSubmitted} canWrite={canWrite} />
      ) : (
        <p className="desk__lede">Library sample — no satisfaction form.</p>
      )}
    </div>
  );
}
