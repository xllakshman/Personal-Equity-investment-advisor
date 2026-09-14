import { approvePrompt, stagePrompt } from "@/app/admin/(console)/console-actions";
import { requirePlatformAdmin } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPromptPage() {
  const session = await requirePlatformAdmin();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("prompt_versions_meta")
    .select("id, semver, submitted_by, promoted_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div>
      <h1>Prompt registry</h1>
      <p>List is semver only. Body is never sent to a desk client.</p>
      <form action={stagePrompt}>
        <label>
          semver
          <input name="semver" required placeholder="v0.2.0" />
        </label>
        <label>
          body
          <textarea name="body" rows={8} required />
        </label>
        <button type="submit">Stage</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>semver</th>
            <th>submitted</th>
            <th>promoted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={String(r.id)}>
              <td>{String(r.semver)}</td>
              <td>{r.submitted_by ? String(r.submitted_by).slice(0, 8) : "—"}</td>
              <td>{r.promoted_at ? String(r.promoted_at).slice(0, 10) : "—"}</td>
              <td>
                <form action={approvePrompt}>
                  <input type="hidden" name="promptId" value={String(r.id)} />
                  <input
                    type="hidden"
                    name="submittedBy"
                    value={r.submitted_by ? String(r.submitted_by) : ""}
                  />
                  <button
                    type="submit"
                    disabled={
                      !r.submitted_by || String(r.submitted_by) === session.userId
                    }
                  >
                    Approve (other admin)
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
