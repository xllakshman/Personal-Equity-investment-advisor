"use client";

import { useActionState } from "react";

import { setModelClass } from "@/app/admin/(console)/console-actions";
import { EMPTY_PLAN_EDIT } from "@/lib/admin/plan-edit";

export function ModelClassForm({
  modelId,
  thesisClass,
}: {
  modelId: string;
  thesisClass: "frontier" | "quick";
}) {
  const [state, action, pending] = useActionState(setModelClass, EMPTY_PLAN_EDIT);

  return (
    <form action={action} className="admin__class-form">
      <input type="hidden" name="model_id" value={modelId} />
      <label>
        <span className="admin__sr">Class</span>
        <select
          className="admin__input"
          name="thesis_class"
          defaultValue={thesisClass}
          disabled={pending}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          <option value="frontier">Frontier</option>
          <option value="quick">Quick</option>
        </select>
      </label>
      {state.error ? <p className="admin__error">{state.error}</p> : null}
      {state.notice ? <p className="admin__notice">{state.notice}</p> : null}
    </form>
  );
}
