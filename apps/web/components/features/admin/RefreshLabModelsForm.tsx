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
        Change Frontier or Quick on each row. That writes{" "}
        <code>model_catalog.thesis_class</code> with this admin session — Analyse
        groups agents from that column on the next load. Fetch latest models
        POSTs to analysis-api on the droplet (lab keys on that process, not
        Vercel) and upserts model_catalog.
        Frontier is the latest generation; Quick is at least two generations
        behind for OpenAI / xAI / DeepSeek and one generation behind for
        Anthropic. Then tick agents on each plan card and Save.
      </p>
      <button className="admin__btn" type="submit" disabled={pending}>
        {pending ? "Fetching labs…" : "Fetch latest lab models"}
      </button>
      {state.error ? <p className="admin__error">{state.error}</p> : null}
      {state.notice ? <p className="admin__notice">{state.notice}</p> : null}
    </form>
  );
}
