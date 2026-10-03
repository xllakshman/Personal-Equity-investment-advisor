"use client";

import { useActionState } from "react";

import { setFamilyPlan } from "@/app/admin/(console)/console-actions";
import { EMPTY_FAMILY_PLAN } from "@/lib/admin/family-plan";

export function AccountPlanForm({
  familyId,
  plans,
  currentPlanId,
  pendingPlanId,
}: {
  familyId: string;
  plans: { id: string; title: string }[];
  currentPlanId: string | null;
  pendingPlanId: string | null;
}) {
  const [state, action, pending] = useActionState(setFamilyPlan, EMPTY_FAMILY_PLAN);
  const defaultPlan = pendingPlanId || currentPlanId || plans[0]?.id || "";
  return (
    <form action={action} className="admin__form admin__form--row">
      <input type="hidden" name="family_id" value={familyId} />
      <select
        className="admin__input"
        name="plan_id"
        defaultValue={defaultPlan}
        aria-label="Plan to activate"
      >
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
            {p.id === pendingPlanId ? " · requested" : ""}
          </option>
        ))}
      </select>
      <button
        className="admin__btn admin__btn--solid"
        type="submit"
        name="intent"
        value="activate"
        disabled={pending || !familyId}
      >
        {pending ? "Saving…" : "Activate"}
      </button>
      <button
        className="admin__btn"
        type="submit"
        name="intent"
        value="deactivate"
        disabled={pending || !familyId}
      >
        Deactivate
      </button>
      {state.error ? <p className="admin__error">{state.error}</p> : null}
      {state.notice ? <p className="admin__notice">{state.notice}</p> : null}
    </form>
  );
}
