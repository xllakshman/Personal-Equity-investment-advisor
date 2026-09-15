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
      <header className="admin__hero">
        <div>
          <p className="admin__kicker">Platform administration</p>
          <h1 className="admin__h1">Prompt registry</h1>
          <p className="admin__lede">
            Versioned, reviewable, never user-visible. This list is semver and
            dates only — the body is never sent to a desk client.
          </p>
        </div>
      </header>

      <div className="admin__grid">
        <section className="admin__card">
          <h2 className="admin__h2">Stage a version</h2>
          <p className="admin__lede" style={{ margin: "0 0 16px" }}>
            Staging saves a new version. Another admin must approve it before it is
            used. Self-approve is disabled.
          </p>
          <form action={stagePrompt} className="admin__form">
            <label className="admin__field" htmlFor="prompt-semver">
              Version
              <input
                id="prompt-semver"
                className="admin__input"
                name="semver"
                required
                placeholder="v0.2.0"
                autoComplete="off"
              />
            </label>
            <label className="admin__field" htmlFor="prompt-body">
              Prompt text
              <textarea
                id="prompt-body"
                className="admin__textarea"
                name="body"
                rows={8}
                required
              />
            </label>
            <p className="admin__hint">
              After Stage, the table below still shows versions and dates only — not
              the prompt text.
            </p>
            <button className="admin__btn admin__btn--solid" type="submit">
              Stage
            </button>
          </form>
        </section>

        <section className="admin__card">
          <h2 className="admin__h2">Prompt protection</h2>
          <ul className="admin__protect">
            <li>
              <span className="admin__dot" aria-hidden />
              The system prompt is never returned by any API response, including
              error payloads and streamed tokens.
            </li>
            <li>
              <span className="admin__dot" aria-hidden />
              Extraction attempts in the refine loop are classified server-side
              and answered with a fixed refusal, then counted per account.
            </li>
            <li>
              <span className="admin__dot" aria-hidden />
              Two-person rule: the admin who staged a version cannot approve it.
            </li>
          </ul>
        </section>
      </div>

      <section className="admin__card admin__card--table">
        <div className="admin__scroll">
          <table className="admin__table">
            <colgroup>
              <col style={{ width: "28%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "22%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Version</th>
                <th>Submitted</th>
                <th>Promoted</th>
                <th>status</th>
                <th className="admin__actions"> </th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => {
                const selfStaged =
                  !r.submitted_by || String(r.submitted_by) === session.userId;
                const promoted = Boolean(r.promoted_at);
                return (
                  <tr key={String(r.id)}>
                    <td className="admin__mono">{String(r.semver)}</td>
                    <td className="admin__muted">
                      {r.submitted_by ? String(r.submitted_by).slice(0, 8) : "—"}
                    </td>
                    <td className="admin__muted">
                      {r.promoted_at ? String(r.promoted_at).slice(0, 10) : "—"}
                    </td>
                    <td>
                      <span
                        className={
                          promoted
                            ? "admin__chip admin__chip--ok"
                            : "admin__chip admin__chip--muted"
                        }
                      >
                        {promoted ? "Promoted" : "Staged"}
                      </span>
                    </td>
                    <td className="admin__actions">
                      <form action={approvePrompt}>
                        <input
                          type="hidden"
                          name="promptId"
                          value={String(r.id)}
                        />
                        <input
                          type="hidden"
                          name="submittedBy"
                          value={r.submitted_by ? String(r.submitted_by) : ""}
                        />
                        <button
                          className="admin__btn"
                          type="submit"
                          disabled={selfStaged}
                          title={
                            selfStaged
                              ? "A different admin must approve this version"
                              : "Approve as a second admin"
                          }
                        >
                          Approve (other admin)
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
