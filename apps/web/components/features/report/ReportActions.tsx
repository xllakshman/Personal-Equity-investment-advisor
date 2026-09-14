"use client";

import { useActionState } from "react";

import {
  EMPTY_REPORT_STATE,
  downloadReportPdf,
  renameReport,
} from "@/app/(desk)/reports/actions";

export function RenameForm({
  reportId,
  currentName,
}: {
  reportId: string;
  currentName: string;
}) {
  const [state, action, pending] = useActionState(renameReport, EMPTY_REPORT_STATE);
  return (
    <form action={action} className="pf__row" style={{ alignItems: "flex-end", gap: 8 }}>
      <input type="hidden" name="reportId" value={reportId} />
      <label className="pf__label" style={{ flex: 1 }}>
        Rename
        <input
          className="pf__input"
          name="name"
          defaultValue={currentName}
          required
          minLength={1}
        />
      </label>
      <button className="pf__ghost" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save name"}
      </button>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
    </form>
  );
}

export function PdfDownloadButton({
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
      <button className="pf__ghost" type="submit" disabled={!ready || pending}>
        {ready ? (pending ? "Opening…" : "Download PDF") : "PDF not ready"}
      </button>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
    </form>
  );
}
