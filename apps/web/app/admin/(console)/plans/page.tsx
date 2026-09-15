import { savePlanLimit } from "@/app/admin/(console)/console-actions";
import { requirePlatformAdmin } from "@/lib/admin/session";
import { planCardTitle } from "@/lib/billing/plan-titles";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPlansPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("id, slug, name, monthly_analysis_limit, allowed_model_ids")
    .order("sort_order");
  const { data: notices } = await supabase
    .from("plan_notice_thresholds")
    .select("plan_id, pct, message")
    .order("pct");

  return (
    <div>
      <header className="admin__hero">
        <div>
          <p className="admin__kicker">Platform administration</p>
          <h1 className="admin__h1">Plans and limits</h1>
          <p className="admin__lede">
            Edits apply to the next billing cycle copy. Does not charge anyone.
          </p>
        </div>
      </header>
      <div className="admin__grid">
        {(plans ?? []).map((p) => (
          <form action={savePlanLimit} key={p.id} className="admin__card admin__form">
            <input type="hidden" name="planId" value={p.id} />
            <div>
              <h2 className="admin__h2">
                {planCardTitle(String(p.slug), String(p.name))}
              </h2>
              <p className="admin__hint">slug {p.slug}</p>
            </div>
            <label className="admin__field">
              monthly_analysis_limit
              <input
                className="admin__input"
                name="monthly_analysis_limit"
                type="number"
                defaultValue={Number(p.monthly_analysis_limit)}
              />
            </label>
            <p className="admin__hint">
              models {(p.allowed_model_ids ?? []).join(", ") || "—"}
            </p>
            <p className="admin__hint">
              notices{" "}
              {(notices ?? [])
                .filter((n) => n.plan_id === p.id)
                .map((n) => `${n.pct}%`)
                .join(", ") || "—"}
            </p>
            <button className="admin__btn admin__btn--solid" type="submit">
              Save limit
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
