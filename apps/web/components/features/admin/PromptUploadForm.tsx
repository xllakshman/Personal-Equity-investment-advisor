"use client";

import { useActionState } from "react";

import { stagePrompt } from "@/app/admin/(console)/console-actions";
import { PROMPT_UPLOAD_HINT } from "@/lib/admin/operator-copy";
import { EMPTY_PROMPT_STATE } from "@/lib/admin/prompt-name";

export function PromptUploadForm() {
  const [state, action, pending] = useActionState(stagePrompt, EMPTY_PROMPT_STATE);
  return (
    <form action={action} className="admin__form">
      {state.error ? <p className="admin__error">{state.error}</p> : null}
      {state.notice ? <p className="admin__notice">{state.notice}</p> : null}
      <label className="admin__field" htmlFor="prompt-role">
        Used for
        <select id="prompt-role" className="admin__input" name="role" defaultValue="advisor">
          <option value="advisor">Stock notes (Analyse Submit)</option>
          <option value="refine_gate">Follow-up check</option>
          <option value="weekly_digest">Weekly email</option>
        </select>
      </label>
      <label className="admin__field" htmlFor="prompt-semver">
        Name (timestamp is added on save)
        <input
          id="prompt-semver"
          className="admin__input"
          name="semver"
          placeholder="Advisor core"
          autoComplete="off"
        />
      </label>
      <label className="admin__field" htmlFor="prompt-file">
        Upload .txt or .md
        <input
          id="prompt-file"
          className="admin__file"
          type="file"
          name="file"
          accept=".txt,.md,text/plain,text/markdown"
        />
      </label>
      <label className="admin__field" htmlFor="prompt-body">
        Or paste prompt text
        <textarea id="prompt-body" className="admin__textarea" name="body" rows={8} />
      </label>
      <p className="admin__hint">{PROMPT_UPLOAD_HINT}</p>
      <button className="admin__btn admin__btn--solid" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save version"}
      </button>
    </form>
  );
}
