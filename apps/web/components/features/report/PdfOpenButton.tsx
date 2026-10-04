"use client";

import { useActionState } from "react";

import { downloadReportPdf } from "@/app/(desk)/reports/actions";
import { EMPTY_REPORT_STATE } from "@/lib/reports/action-state";

export function PdfOpenButton({
  reportId,
  ready,
}: {
  reportId: string;
  ready: boolean;
}) {
  const [state, action, pending] = useActionState(
    downloadReportPdf,
    EMPTY_REPORT_STATE,
  );
  return (
    <form action={action}>
      <input type="hidden" name="reportId" value={reportId} />
      <button className="rpt__pdf" type="submit" disabled={!ready || pending}>
        {ready ? (pending ? "Opening…" : "Open PDF") : "PDF not ready"}
      </button>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
    </form>
  );
}
