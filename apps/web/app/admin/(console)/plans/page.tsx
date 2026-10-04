import { ModelClassForm } from "@/components/features/admin/ModelClassForm";
import { PlanEditForm } from "@/components/features/admin/PlanEditForm";
import { PlanSharedForm } from "@/components/features/admin/PlanSharedForm";
import { RefreshLabModelsForm } from "@/components/features/admin/RefreshLabModelsForm";
import { ADMIN_KICKER, LAB_MODELS_EMPTY, PLANS_LEDE } from "@/lib/admin/operator-copy";
import { NOTICE_PCTS, sharedPlanDefaults } from "@/lib/admin/plan-edit";
import { requirePlatformAdmin } from "@/lib/admin/session";
import { isNativeProvider } from "@/lib/analyse/models";
import { createClient } from "@/lib/supabase/server";

/** Fetch latest models POSTs to the droplet and waits on four lab lists. */
export const maxDuration = 60;

export default async function AdminPlansPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select(
      "id, slug, name, monthly_analysis_limit, price_cents, weekly_digest_ticker_limit, is_active, allowed_model_ids, who_copy, why_copy",
    )
    .order("sort_order");
  const { data: notices } = await supabase
    .from("plan_notice_thresholds")
    .select("plan_id, pct, message")
    .order("pct");
  const { data: catalog } = await supabase
    .from("model_catalog")
    .select("id, label, provider, thesis_class, provider_model_id")
    .eq("is_active", true)
    .order("sort_order");

  const agents = (catalog ?? [])
    .filter((m) => isNativeProvider(String(m.provider)))
    .filter((m) => m.thesis_class === "frontier" || m.thesis_class === "quick")
    .map((m) => ({
      id: String(m.id),
      label: String(m.label),
      thesis_class: m.thesis_class === "frontier" ? ("frontier" as const) : ("quick" as const),
    }));

  const shared = sharedPlanDefaults(
    (plans ?? []).map((p) => ({
      allowedModelIds: Array.isArray(p.allowed_model_ids)
        ? p.allowed_model_ids.map((id) => String(id))
        : [],
      whoCopy: String(p.who_copy ?? ""),
    })),
  );

  return (
    <div>
      <header className="admin__hero">
        <div>
          <p className="admin__kicker">{ADMIN_KICKER}</p>
          <h1 className="admin__h1">Plans and limits</h1>
          <p className="admin__lede">{PLANS_LEDE}</p>
        </div>
      </header>
      <section className="admin__card" style={{ marginBottom: 16 }}>
        <h2 className="admin__h2">Lab models</h2>
        <RefreshLabModelsForm />
        <div className="admin__scroll" style={{ marginTop: 16 }}>
          <table className="admin__table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Lab</th>
                <th>Class</th>
                <th>Lab model id</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="admin__muted">
                    {LAB_MODELS_EMPTY}
                  </td>
                </tr>
              ) : (
                (catalog ?? [])
                  .filter((m) => isNativeProvider(String(m.provider)))
                  .map((m) => (
                    <tr key={String(m.id)}>
                      <td>{String(m.label)}</td>
                      <td>{String(m.provider)}</td>
                      <td>
                        <ModelClassForm
                          modelId={String(m.id)}
                          thesisClass={
                            m.thesis_class === "frontier" ? "frontier" : "quick"
                          }
                        />
                      </td>
                      <td className="admin__mono">{String(m.provider_model_id)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <PlanSharedForm
        catalog={agents}
        allowedModelIds={shared.allowedModelIds}
        whoCopy={shared.whoCopy}
      />
      <div className="admin__grid">
        {(plans ?? []).map((p) => {
          const planNotices = NOTICE_PCTS.map((pct) => {
            const row = (notices ?? []).find(
              (n) => n.plan_id === p.id && Number(n.pct) === pct,
            );
            return { pct, message: row?.message ? String(row.message) : "" };
          });
          return (
            <PlanEditForm
              key={p.id}
              plan={{
                id: String(p.id),
                slug: String(p.slug),
                name: String(p.name),
                monthlyAnalysisLimit: Number(p.monthly_analysis_limit ?? 0),
                priceCents: Number(p.price_cents ?? 0),
                weeklyDigestTickerLimit: Number(p.weekly_digest_ticker_limit ?? 3),
                isActive: p.is_active !== false,
                whyCopy: String(p.why_copy ?? ""),
                notices: planNotices,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
