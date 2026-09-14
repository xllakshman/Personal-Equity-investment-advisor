import { saveWatchLimit } from "@/app/admin/(console)/console-actions";
import { requirePlatformAdmin } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";

const TABS = [
  "overview",
  "watch",
  "apis",
  "latency",
  "who",
  "feedback",
] as const;

export default async function ObservabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; range?: string }>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "overview";
  const supabase = await createClient();
  const { data: thresholds } = await supabase
    .from("observability_thresholds")
    .select("watch_kind, label, limit_value, unit")
    .order("watch_kind");
  const { data: buckets } = await supabase
    .from("observability_minute_buckets")
    .select("bucket_start, product_id, route, calls, failed, duration_ms_sum")
    .order("bucket_start", { ascending: false })
    .limit(200);
  const { data: feedback } = await supabase
    .from("analysis_feedback")
    .select(
      "created_at, ticker, model_id, helpful, dim_evidence, dim_decision, dim_bear, dim_next_steps, dim_personal_fit, comment, user_id",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const calls = (buckets ?? []).reduce((s, b) => s + Number(b.calls), 0);
  const failed = (buckets ?? []).reduce((s, b) => s + Number(b.failed), 0);
  const yes = (feedback ?? []).filter((f) => f.helpful).length;

  return (
    <div>
      <h1>Observability</h1>
      <p>Colours on this screen only. No email. Prompt body and report sections are not stored.</p>
      <nav>
        {TABS.map((t) => (
          <a key={t} href={`/admin/observability?tab=${t}`} style={{ marginRight: 12 }}>
            {t === "feedback" ? "Customer Feedback" : t}
          </a>
        ))}
      </nav>
      {tab === "overview" || tab === "watch" ? (
        <section>
          <p>
            Calls {calls} · failed {failed}
          </p>
          {(thresholds ?? []).map((t) => (
            <form action={saveWatchLimit} key={t.watch_kind} style={{ margin: "10px 0" }}>
              <input type="hidden" name="watch_kind" value={t.watch_kind} />
              <label>
                {t.label} ({t.unit})
                <input name="limit_value" defaultValue={String(t.limit_value)} />
              </label>
              <button type="submit">Save</button>
            </form>
          ))}
        </section>
      ) : null}
      {tab === "apis" || tab === "latency" ? (
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Calls</th>
              <th>Failed</th>
              <th>Avg ms</th>
            </tr>
          </thead>
          <tbody>
            {(buckets ?? []).map((b, i) => (
              <tr key={`${b.product_id}-${b.route}-${i}`}>
                <td>
                  {b.product_id} {b.route}
                </td>
                <td>{b.calls}</td>
                <td>{b.failed}</td>
                <td>
                  {Number(b.calls) > 0
                    ? Math.round(Number(b.duration_ms_sum) / Number(b.calls))
                    : 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {tab === "who" ? (
        <p>Rows come from observability_events per person + product. Admin login is not a desk ping.</p>
      ) : null}
      {tab === "feedback" ? (
        <section>
          <p>
            {feedback?.length ?? 0} responses ·{" "}
            {feedback && feedback.length > 0
              ? `${Math.round((yes / feedback.length) * 100)}% Yes`
              : "No responses yet"}
          </p>
          {(feedback ?? []).length === 0 ? (
            <p>No responses yet</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Ticker</th>
                  <th>Model</th>
                  <th>Helpful</th>
                  <th>Dims</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {(feedback ?? []).map((f, i) => (
                  <tr key={i}>
                    <td>{String(f.created_at).slice(0, 16)}</td>
                    <td>{String(f.ticker)}</td>
                    <td>{String(f.model_id)}</td>
                    <td>{f.helpful ? "Yes" : "No"}</td>
                    <td>
                      {[
                        f.dim_evidence,
                        f.dim_decision,
                        f.dim_bear,
                        f.dim_next_steps,
                        f.dim_personal_fit,
                      ]
                        .map((d) => (d == null ? "—" : String(d)))
                        .join(" ")}
                    </td>
                    <td>{f.comment ? String(f.comment) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </div>
  );
}
