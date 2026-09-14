"use client";

import { useActionState } from "react";

import { EMPTY_FAMILY, saveCrashLetter } from "@/app/(desk)/settings/family-actions";

export function CrashLetterForm({ defaultBody }: { defaultBody: string }) {
  const [state, action, pending] = useActionState(saveCrashLetter, EMPTY_FAMILY);
  return (
    <form action={action} className="pf__stack">
      <label className="pf__label">
        Letter
        <textarea className="pf__input" name="body" rows={16} defaultValue={defaultBody} />
      </label>
      <button className="pf__primary" type="submit" disabled={pending}>
        Save
      </button>
      <button className="pf__ghost" type="submit" name="draft_model" value="1" disabled={pending}>
        Draft with model (no confirm — does nothing)
      </button>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
    </form>
  );
}
