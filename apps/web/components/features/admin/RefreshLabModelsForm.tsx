"use client";

import { useActionState } from "react";

import { refreshLabModels } from "@/app/admin/(console)/console-actions";
import { EMPTY_PLAN_EDIT } from "@/lib/admin/plan-edit";

export function RefreshLabModelsForm() {
  const [state, action, pending] = useActionState(
    refreshLabModels,
    EMPTY_PLAN_EDIT,
  );
  return (
    <form action={action} className="admin__form">
      <p className="admin__lede" style={{ margin: 0 }}>
        Calls Anthropic, OpenAI, xAI, and DeepSeek model lists from analysis-api
        (lab keys on that process, not Vercel). Frontier is the latest
        generation; Quick is at least two generations behind for OpenAI / xAI /
        DeepSeek (GPT-4 vs GPT-6) and one generation behind for Anthropic (Opus
        4 vs Opus 5). Then tick agents on each plan card and Save.
      </p>
      <button className="admin__btn admin__btn--solid" type="submit" disabled={pending}>
        {pending ? "Fetching labs…" : "Fetch latest lab models"}
      </button>
      {state.error ? <p className="admin__error">{state.error}</p> : null}
      {state.notice ? <p className="admin__notice">{state.notice}</p> : null}
    </form>
  );
}
