import { promotePrompt } from "@/app/admin/(console)/console-actions";
import { PromptUploadForm } from "@/components/features/admin/PromptUploadForm";
import { requirePlatformAdmin } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";

function rowRole(row: { role?: string | null }): string {
  return row.role ? String(row.role) : "advisor";
}

function statusLabel(row: {
  promoted_at: string | null;
  superseded_at: string | null;
}): { label: string; kind: "ok" | "muted" | "warn" } {
  if (row.promoted_at && !row.superseded_at) {
    return { label: "In use", kind: "ok" };
  }
  if (row.promoted_at && row.superseded_at) {
    return { label: "Previous", kind: "muted" };
  }
  return { label: "Not promoted", kind: "warn" };
}

type PromptMeta = {
  id: string;
  semver: string;
  role?: string | null;
  submitted_by: string | null;
  promoted_at: string | null;
  superseded_at: string | null;
  created_at: string | null;
};

export default async function AdminPromptPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; err?: string }>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const supabase = await createClient();
  const first = await supabase
    .from("prompt_versions_meta")
    .select("id, semver, role, submitted_by, promoted_at, superseded_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const listed = first.error
    ? await supabase
        .from("prompt_versions_meta")
        .select("id, semver, submitted_by, promoted_at, superseded_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
    : first;
  const rows: PromptMeta[] = (listed.data ?? []).map((r) => ({
    id: String(r.id),
    semver: String(r.semver),
    role: "role" in r ? String(r.role ?? "advisor") : "advisor",
    submitted_by: r.submitted_by ? String(r.submitted_by) : null,
    promoted_at: r.promoted_at ? String(r.promoted_at) : null,
    superseded_at: r.superseded_at ? String(r.superseded_at) : null,
    created_at: r.created_at ? String(r.created_at) : null,
  }));

  const inUse = rows.filter((r) => r.promoted_at && !r.superseded_at);
  const viewId = sp.view || (inUse[0] ? inUse[0].id : rows[0]?.id || "");
  let body: string | null = null;
  let bodyError: string | null = sp.err ? String(sp.err) : null;
  if (viewId) {
    const { data, error } = await supabase
      .from("prompt_versions")
      .select("body, semver")
      .eq("id", viewId)
      .maybeSingle();
    if (error) {
      bodyError =
        bodyError ??
        (error.message.includes("permission") || error.code === "42501"
          ? "Apply migration 023 so this admin session can read prompt_versions.body."
          : error.message);
    } else {
      body = data?.body ? String(data.body) : null;
    }
  }
  const viewed = (rows ?? []).find((r) => String(r.id) === viewId);

  return (
    <div>
      <header className="admin__hero">
        <div>
          <p className="admin__kicker">Platform administration</p>
          <h1 className="admin__h1">Prompt</h1>
          <p className="admin__lede">
            Upload a version, read it here, download any previous file, then
            Promote. The worker reads the promoted advisor row from{" "}
            <code>prompt_versions</code> (<code>promoted_at</code> set,{" "}
            <code>superseded_at</code> empty). Desk clients never receive the
            body.
          </p>
        </div>
      </header>

      {inUse.length > 0 ? (
        <section className="admin__card" style={{ marginBottom: 16 }}>
          <h2 className="admin__h2">Currently used by Analyse</h2>
          <ul className="admin__list">
            {inUse.map((r) => (
              <li key={String(r.id)}>
                <strong>{String(r.semver)}</strong>
                {" · "}
                {rowRole(r)}
                {" · promoted "}
                {r.promoted_at ? String(r.promoted_at).replace("T", " ").slice(0, 19) : "—"}{" "}
                UTC
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="admin__error" style={{ marginBottom: 16 }}>
          No promoted prompt. Submit on Analyse uses the last promoted advisor
          row; until you Promote one, the worker has nothing new to load.
        </p>
      )}

      <div className="admin__grid">
        <section className="admin__card">
          <h2 className="admin__h2">Upload a version</h2>
          <PromptUploadForm />
        </section>
        <section className="admin__card">
          <h2 className="admin__h2">Review</h2>
          {bodyError ? <p className="admin__error">{bodyError}</p> : null}
          {viewed ? (
            <>
              <p className="admin__lede" style={{ margin: "0 0 12px" }}>
                {String(viewed.semver)} · {rowRole(viewed)} ·{" "}
                {statusLabel(viewed).label}
              </p>
              <pre className="admin__prompt-body">{body ?? "—"}</pre>
              <p className="admin__row" style={{ marginTop: 14 }}>
                <a className="admin__btn" href={`/admin/prompt/${viewId}/download`}>
                  Download this version
                </a>
                {viewed.promoted_at && !viewed.superseded_at ? (
                  <span className="admin__chip admin__chip--ok">In use</span>
                ) : (
                  <form action={promotePrompt}>
                    <input type="hidden" name="promptId" value={viewId} />
                    <button className="admin__btn admin__btn--solid" type="submit">
                      Promote — users get this
                    </button>
                  </form>
                )}
              </p>
            </>
          ) : (
            <p className="admin__hint">Save a version to review it here.</p>
          )}
        </section>
      </div>

      <section className="admin__card admin__card--table">
        <div className="admin__scroll">
          <table className="admin__table">
            <colgroup>
              <col style={{ width: "38%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Saved</th>
                <th>Status</th>
                <th className="admin__actions"> </th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => {
                const status = statusLabel(r);
                const id = String(r.id);
                const chip =
                  status.kind === "ok"
                    ? "admin__chip admin__chip--ok"
                    : status.kind === "warn"
                      ? "admin__chip"
                      : "admin__chip admin__chip--muted";
                return (
                  <tr key={id}>
                    <td className="admin__mono">{String(r.semver)}</td>
                    <td>{rowRole(r)}</td>
                    <td className="admin__muted">
                      {r.created_at
                        ? String(r.created_at).replace("T", " ").slice(0, 19)
                        : "—"}
                    </td>
                    <td>
                      <span className={chip}>{status.label}</span>
                    </td>
                    <td className="admin__actions">
                      <a className="admin__btn" href={`/admin/prompt?view=${id}`}>
                        Review
                      </a>{" "}
                      <a className="admin__btn" href={`/admin/prompt/${id}/download`}>
                        Download
                      </a>
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
