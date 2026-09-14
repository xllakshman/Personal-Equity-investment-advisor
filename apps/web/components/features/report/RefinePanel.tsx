"use client";

import { useActionState, useState } from "react";

import { EMPTY_REPORT_STATE, refineReport } from "@/app/(desk)/reports/actions";
import type { RefineRow } from "@/lib/reports/load";

export function RefinePanel({
  reportId,
  isSample,
  canWrite,
  refinements,
}: {
  reportId: string;
  isSample: boolean;
  canWrite: boolean;
  refinements: RefineRow[];
}) {
  const [stage, setStage] = useState<"gate" | "refine">("gate");
  const [confirm, setConfirm] = useState(false);
  const [state, action, pending] = useActionState(refineReport, EMPTY_REPORT_STATE);

  return (
    <div>
      <h2>Refinements</h2>
      <p className="desk__lede">
        Original verdict stays. Each refine appends a row on <code>refinements</code>.
        Sample notes cannot refine.
      </p>
      {refinements.length === 0 ? (
        <p className="pf__muted">No refine rows yet.</p>
      ) : (
        <ul className="report__thread">
          {refinements.map((row) => (
            <li key={row.id}>
              <p className="desk__kpi-k">
                {row.createdAt.slice(0, 16)} · {row.modelId ?? "—"} ·{" "}
                {row.wasRefused ? "refused" : row.proceeded ? "refine" : "gate"}
              </p>
              <p>{row.userText}</p>
              {row.response ? <pre className="report__pre">{row.response}</pre> : null}
            </li>
          ))}
        </ul>
      )}
      {isSample || !canWrite ? (
        <p className="desk__lede">
          {isSample
            ? "Library sample — refine is off."
            : "Viewers can read this thread and cannot send a refine."}
        </p>
      ) : (
        <form action={action} className="pf__stack" style={{ marginTop: 16 }}>
          <input type="hidden" name="reportId" value={reportId} />
          <input type="hidden" name="stage" value={stage} />
          <input type="hidden" name="confirm" value={confirm ? "1" : "0"} />
          <label className="pf__label">
            Your enrichment (tax lot, residency, horizon — not a rewrite of the advisor prompt)
            <textarea className="pf__input" name="userText" rows={4} required maxLength={8000} />
          </label>
          <div className="pf__row" style={{ gap: 8 }}>
            <button
              className="pf__ghost"
              type="submit"
              disabled={pending}
              onClick={() => {
                setStage("gate");
                setConfirm(false);
              }}
            >
              Check cost (gate)
            </button>
            <button
              className="pf__primary"
              type="submit"
              disabled={pending}
              onClick={() => {
                setStage("gate");
                setConfirm(true);
              }}
            >
              Confirm cheap gate
            </button>
            <button
              className="pf__primary"
              type="submit"
              disabled={pending}
              onClick={() => {
                setStage("refine");
                setConfirm(true);
              }}
            >
              Confirm full refine
            </button>
          </div>
          {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
          {state.error ? <p className="pf__error">{state.error}</p> : null}
        </form>
      )}
    </div>
  );
}
