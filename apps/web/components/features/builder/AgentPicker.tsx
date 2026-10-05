"use client";

import {
  agentCreditLabel,
  agentEligibility,
  type CatalogModel,
} from "@/lib/analyse/models";

export function AgentPicker({
  models,
  allowedIds,
  planSlug,
  planName,
  selectedId,
  onSelect,
}: {
  models: CatalogModel[];
  allowedIds: readonly string[];
  planSlug: string;
  planName: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const eligible = models.filter(
    (m) => agentEligibility(m, allowedIds, planSlug).allowed,
  );
  const locked = models.filter(
    (m) => !agentEligibility(m, allowedIds, planSlug).allowed,
  );

  return (
    <div className="bld__agents">
      <p className="pf__lede">
        Frontier agents cost 1.5 credits. Quick agents cost 1 credit. {planName}:
        names marked On plan can be submitted.
      </p>
      <label className="pf__label">
        Agent
        <select
          className="pf__input"
          value={selectedId ?? ""}
          onChange={(e) => {
            if (e.target.value) onSelect(e.target.value);
          }}
          aria-label="Choose your agent"
        >
          <option value="">Select an agent on plan</option>
          {eligible.map((m) => {
            const el = agentEligibility(m, allowedIds, planSlug);
            return (
              <option key={m.id} value={m.id}>
                {m.label} · {agentCreditLabel(m.thesis_class)} · {el.badge}
              </option>
            );
          })}
          {locked.map((m) => {
            const el = agentEligibility(m, allowedIds, planSlug);
            return (
              <option key={m.id} value={m.id} disabled>
                {m.label} · {agentCreditLabel(m.thesis_class)} · {el.badge}
              </option>
            );
          })}
        </select>
      </label>
    </div>
  );
}
