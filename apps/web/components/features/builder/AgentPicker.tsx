"use client";

import { modelCost } from "@/lib/analyse/format";
import {
  agentEligibility,
  groupModels,
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
  const groups = groupModels(models);
  const bands = [
    {
      key: "frontier" as const,
      title: "Frontier agents",
      hint: "Eligible on Professional and above. Locked on Trial and Basic.",
      rows: groups.frontier,
    },
    {
      key: "quick" as const,
      title: "Quick agents",
      hint: "Eligible on Trial and Basic, and still available on higher plans.",
      rows: groups.quick,
    },
  ];

  return (
    <div className="bld__agents">
      <p className="pf__lede">
        Choose your agent. Cards marked On your plan are eligible for {planName}.
        Locked cards need a higher plan.
      </p>
      {bands.map((band) => (
        <div key={band.key}>
          <p className="bld__group">{band.title}</p>
          <p className="pf__lede" style={{ margin: "0 0 8px" }}>
            {band.hint}
          </p>
          {band.rows.length === 0 ? (
            <p className="pf__lede">None listed.</p>
          ) : (
            band.rows.map((m) => {
              const el = agentEligibility(m, allowedIds);
              const on = selectedId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`bld__model${on ? " bld__model--on" : ""}${
                    el.allowed ? "" : " bld__model--locked"
                  }`}
                  disabled={!el.allowed}
                  aria-pressed={on}
                  aria-label={`${m.label}. ${el.badge}.`}
                  onClick={() => onSelect(m.id)}
                >
                  <div className="bld__model-row">
                    <b>{m.label}</b>
                    <span>{modelCost(m.cost_cents_per_run)}</span>
                  </div>
                  <span>
                    {m.provider} · {m.vendor_class}
                  </span>
                  <em className={el.allowed ? "bld__elig bld__elig--on" : "bld__elig"}>
                    {el.badge}
                  </em>
                </button>
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}
