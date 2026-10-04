"use client";

import { removePrompt } from "@/app/admin/(console)/console-actions";

export function RemovePromptButton({
  promptId,
  label,
}: {
  promptId: string;
  label: string;
}) {
  return (
    <form
      action={removePrompt}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remove ${label} from this list? Analyse will not use it.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="promptId" value={promptId} />
      <button className="admin__btn" type="submit">
        Remove
      </button>
    </form>
  );
}
