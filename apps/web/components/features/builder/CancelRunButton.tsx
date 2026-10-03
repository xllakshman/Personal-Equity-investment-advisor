"use client";

import { useActionState, useEffect } from "react";

import { cancelInFlightAnalysis } from "@/app/(desk)/analyse/actions";
import { EMPTY_CANCEL } from "@/lib/analyse/cancel-state";

export function CancelRunButton({
  requestId,
  label = "Reset this run",
}: {
  requestId: string;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(
    cancelInFlightAnalysis,
    EMPTY_CANCEL,
  );

  useEffect(() => {
    if (state.done) window.location.assign("/analyse");
  }, [state.done]);

  return (
    <form action={formAction}>
      <input type="hidden" name="request_id" value={requestId} />
      <button className="desk__btn desk__btn--ghost" type="submit" disabled={pending}>
        {pending ? "Stopping…" : label}
      </button>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
    </form>
  );
}
