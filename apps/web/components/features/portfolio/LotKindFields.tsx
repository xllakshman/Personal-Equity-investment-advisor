"use client";

import type { LotKind } from "@/lib/portfolio/lot-kind";

export function LotKindFields({
  defaultValue = "retail",
  name = "lot_kind",
}: {
  defaultValue?: LotKind;
  name?: string;
}) {
  return (
    <fieldset className="pf__kind">
      <legend className="pf__label">Lot type</legend>
      <label className="pf__check">
        <input
          type="radio"
          name={name}
          value="retail"
          defaultChecked={defaultValue === "retail"}
        />
        Retail
      </label>
      <label className="pf__check">
        <input
          type="radio"
          name={name}
          value="esop"
          defaultChecked={defaultValue === "esop"}
        />
        ESOP
      </label>
    </fieldset>
  );
}
