"use client";

import { useActionState } from "react";

import { savePlanShared } from "@/app/admin/(console)/console-actions";
import {
  EMPTY_PLAN_EDIT,
  type AdminPlanCatalogRow,
} from "@/lib/admin/plan-edit";

export function PlanSharedForm({
  catalog,
  allowedModelIds,
  whoCopy,
}: {
  catalog: AdminPlanCatalogRow[];
  allowedModelIds: string[];
  whoCopy: string;
}) {
  const [state, action, pending] = useActionState(savePlanShared, EMPTY_PLAN_EDIT);
  const frontier = catalog.filter((m) => m.thesis_class === "frontier");
  const quick = catalog.filter((m) => m.thesis_class === "quick");

  return (
    <form action={action} className="admin__card admin__form" style={{ marginBottom: 16 }}>
      <div>
        <h2 className="admin__h2">Agents and who it is for</h2>
        <p className="admin__hint">
          One save writes the same agent list and audience copy to every plan.
          Desk Analyse reads <code>plans.allowed_model_ids</code>. Subscription
          cards read <code>plans.who_copy</code>. Trial and Basic still cannot
          run Frontier agents.
        </p>
      </div>
      <fieldset className="admin__checkset">
        <legend>Agents on the plans</legend>
        <p className="admin__hint">
          Tick who Analyse may run. Hidden labs (Gemini, Kimi) are not listed.
        </p>
        {quick.length > 0 ? <p className="admin__check-k">Quick agents</p> : null}
        {quick.map((m) => (
          <label key={m.id} className="admin__check">
            <input
              type="checkbox"
              name="model_id"
              value={m.id}
              defaultChecked={allowedModelIds.includes(m.id)}
            />
            {m.label}
          </label>
        ))}
        {frontier.length > 0 ? (
          <p className="admin__check-k">Frontier agents</p>
        ) : null}
        {frontier.map((m) => (
          <label key={m.id} className="admin__check">
            <input
              type="checkbox"
              name="model_id"
              value={m.id}
              defaultChecked={allowedModelIds.includes(m.id)}
            />
            {m.label}
          </label>
        ))}
      </fieldset>
      <label className="admin__field">
        Who it is for
        <textarea
          className="admin__textarea"
          name="who_copy"
          rows={3}
          defaultValue={whoCopy}
          required
        />
      </label>
      <button className="admin__btn admin__btn--solid" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save for all plans"}
      </button>
      {state.error ? <p className="admin__error">{state.error}</p> : null}
      {state.notice ? <p className="admin__notice">{state.notice}</p> : null}
    </form>
  );
}
