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
      <h1>Plans and limits</h1>
      <p>Edits apply to the next billing cycle copy. Does not charge anyone.</p>
      {(plans ?? []).map((p) => (
        <form action={savePlanLimit} key={p.id} style={{ margin: "18px 0" }}>
          <input type="hidden" name="planId" value={p.id} />
          <h2>{planCardTitle(String(p.slug), String(p.name))}</h2>
          <p>slug {p.slug}</p>
          <label>
            monthly_analysis_limit
            <input
              name="monthly_analysis_limit"
              type="number"
              defaultValue={Number(p.monthly_analysis_limit)}
            />
          </label>
          <p>models {(p.allowed_model_ids ?? []).join(", ")}</p>
          <p>
            notices{" "}
            {(notices ?? [])
              .filter((n) => n.plan_id === p.id)
              .map((n) => `${n.pct}%`)
              .join(", ")}
          </p>
          <button type="submit">Save limit</button>
        </form>
      ))}
    </div>
  );
}
