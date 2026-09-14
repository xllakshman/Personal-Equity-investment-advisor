"use client";

import { useActionState } from "react";

import { EMPTY_FAMILY, inviteMember } from "@/app/(desk)/settings/family-actions";

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteMember, EMPTY_FAMILY);
  return (
    <form action={action} className="pf__stack">
      <label className="pf__label">
        Email (existing desk user)
        <input className="pf__input" type="email" name="email" required />
      </label>
      <label className="pf__label">
        Role
        <select className="pf__input" name="role" defaultValue="member">
          <option value="member">Member (can analyse)</option>
          <option value="viewer">Viewer (read only)</option>
        </select>
      </label>
      <button className="pf__primary" type="submit" disabled={pending}>
        Invite
      </button>
      {state.error ? <p className="pf__error">{state.error}</p> : null}
      {state.notice ? <p className="pf__banner">{state.notice}</p> : null}
    </form>
  );
}
