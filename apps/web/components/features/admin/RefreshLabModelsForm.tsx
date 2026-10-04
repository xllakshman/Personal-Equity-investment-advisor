"use client";

import { useActionState } from "react";

import { refreshLabModels } from "@/app/admin/(console)/console-actions";
import { LAB_MODELS_LEDE } from "@/lib/admin/operator-copy";
import { EMPTY_PLAN_EDIT } from "@/lib/admin/plan-edit";

export function RefreshLabModelsForm() {
  const [state, action, pending] = useActionState(
    refreshLabModels,
    EMPTY_PLAN_EDIT,
  );
  return (
    <form action={action} className="admin__form">
      <p className="admin__lede" style={{ margin: 0 }}>
        {LAB_MODELS_LEDE}
      </p>
      <button className="admin__btn" type="submit" disabled={pending}>
        {pending ? "Fetching labs…" : "Fetch latest lab models"}
      </button>
      {state.error ? <p className="admin__error">{state.error}</p> : null}
      {state.notice ? <p className="admin__notice">{state.notice}</p> : null}
    </form>
  );
}
