"use client";

import { modelCost } from "@/lib/analyse/format";
import {
  agentEligibility,
  type CatalogModel,
} from "@/lib/analyse/models";

export function AgentPicker({
  models,
  allowedIds,
  planName,
  selectedId,
  onSelect,
}: {
  models: CatalogModel[];
  allowedIds: readonly string[];
  planName: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const eligible = models.filter((m) => agentEligibility(m, allowedIds).allowed);
  const locked = models.filter((m) => !agentEligibility(m, allowedIds).allowed);

  return (
    <div className="bld__agents">
      <p className="pf__lede">
        Agents on {planName} are listed first. Locked names need a higher plan
        and cannot be submitted.
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
          <option value="">Select an agent on your plan</option>
          {eligible.map((m) => {
            const el = agentEligibility(m, allowedIds);
            return (
              <option key={m.id} value={m.id}>
                {m.label} · {modelCost(m.cost_cents_per_run)} · {el.badge}
              </option>
            );
          })}
          {locked.map((m) => {
            const el = agentEligibility(m, allowedIds);
            return (
              <option key={m.id} value={m.id} disabled>
                {m.label} · {el.badge}
              </option>
            );
          })}
        </select>
      </label>
    </div>
  );
}
