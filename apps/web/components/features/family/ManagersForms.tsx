"use client";

import { useActionState } from "react";

import {
  addManagerWatch,
  EMPTY_FAMILY,
  scanManagers,
} from "@/app/(desk)/settings/family-actions";

export function ManagersForms() {
  const [addState, addAction, addPending] = useActionState(addManagerWatch, EMPTY_FAMILY);
  const [scanState, scanAction, scanPending] = useActionState(scanManagers, EMPTY_FAMILY);
  return (
    <div>
      <form action={addAction} className="pf__row" style={{ gap: 8 }}>
        <label className="pf__label">
          Manager name
          <input className="pf__input" name="name" required />
        </label>
        <button className="pf__primary" type="submit" disabled={addPending}>
          Watch
        </button>
      </form>
      {addState.error ? <p className="pf__error">{addState.error}</p> : null}
      {addState.notice ? <p className="pf__banner">{addState.notice}</p> : null}
      <form action={scanAction} style={{ marginTop: 16 }}>
        <button className="pf__ghost" type="submit" disabled={scanPending}>
          Scan without confirm
        </button>
        <button
          className="pf__primary"
          type="submit"
          name="confirm"
          value="1"
          disabled={scanPending}
          style={{ marginLeft: 8 }}
        >
          Confirm scan
        </button>
      </form>
      {scanState.notice ? <p className="pf__banner">{scanState.notice}</p> : null}
    </div>
  );
}
