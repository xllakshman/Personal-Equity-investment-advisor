"use client";

import { useActionState, useState } from "react";

import { EMPTY_REPORT_STATE, submitAnalysisFeedback } from "@/app/(desk)/reports/actions";

const DIMS = [
  ["dim_evidence", "Were the facts and sources clear enough?"],
  ["dim_decision", "Did the note help you decide what to do with this position?"],
  ["dim_bear", "Was the downside / bear case treated seriously?"],
  ["dim_next_steps", "Were the next steps specific enough?"],
  ["dim_personal_fit", "Did it use your holdings, tax residency, and risk/CAGR as you entered them?"],
] as const;

export function FeedbackForm({
  reportId,
  alreadySubmitted,
  canWrite,
}: {
  reportId: string;
  alreadySubmitted: boolean;
  canWrite: boolean;
}) {
  const [helpful, setHelpful] = useState<"yes" | "no" | "">("");
  const [state, action, pending] = useActionState(
    submitAnalysisFeedback,
    EMPTY_REPORT_STATE,
  );

  if (alreadySubmitted) {
    return (
      <div className="desk__card" style={{ marginTop: 22 }}>
        <h2>Satisfaction</h2>
        <p className="desk__lede">Thanks. This survey does not change the verdict.</p>
      </div>
    );
  }
  if (!canWrite) {
    return (
      <div className="desk__card" style={{ marginTop: 22 }}>
        <h2>Satisfaction</h2>
        <p className="desk__lede">Viewers cannot submit this survey.</p>
      </div>
    );
  }

  return (
    <form action={action} className="desk__card" style={{ marginTop: 22 }}>
      <h2>Satisfaction</h2>
      <p className="desk__lede">
        Not billed. Does not change the saved verdict. Closing this tab without
        Submit stores nothing.
      </p>
      <input type="hidden" name="reportId" value={reportId} />
      <fieldset className="pf__stack" style={{ marginTop: 12 }}>
        <legend className="pf__label">Is the analysis provided helpful?</legend>
        <label className="pf__check">
          <input
            type="radio"
            name="helpful"
            value="yes"
            checked={helpful === "yes"}
            onChange={() => setHelpful("yes")}
          />
          Yes
        </label>
        <label className="pf__check">
          <input
            type="radio"
            name="helpful"
            value="no"
            checked={helpful === "no"}
            onChange={() => setHelpful("no")}
          />
          No
        </label>
      </fieldset>
      {DIMS.map(([name, label]) => (
        <label className="pf__label" key={name} style={{ marginTop: 10, display: "block" }}>
          {label} (optional 1–5)
          <select className="pf__input" name={name} defaultValue="">
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="pf__label" style={{ marginTop: 10, display: "block" }}>
        Comment (optional)
        <textarea className="pf__input" name="comment" maxLength={2000} rows={3} />
      </label>
      <button
        className="pf__primary"
        type="submit"
        disabled={pending || helpful === ""}
        style={{ marginTop: 14 }}
      >
        {pending ? "Saving…" : "Submit"}
      </button>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
    </form>
  );
}
