"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireDeskSession } from "@/lib/desk/session";
import { profileDefaults } from "@/lib/profile/defaults";
import { loadInvestorProfile } from "@/lib/profile/load";
import {
  blackoutsFromForm,
  outsideBookFromForm,
  parseNumberField,
  parseOptionalNumber,
} from "@/lib/profile/parse";
import { createClient } from "@/lib/supabase/server";

export type ProfileActionState = {
  error: string | null;
};

export const EMPTY_PROFILE_STATE: ProfileActionState = { error: null };

export async function saveInvestorProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await requireDeskSession();
  const loaded = await loadInvestorProfile(session.familyId, session.userId);
  if (!loaded.ok) {
    return { error: loaded.error };
  }
  if (!loaded.isOwner) {
    return { error: "Only the family owner can save this profile." };
  }

  const d = profileDefaults(loaded.residency);
  const ltcgMonths = parseNumberField(
    String(formData.get("ltcg_holding_months") ?? ""),
    { integer: true, min: 1, fallback: d.ltcg_holding_months },
  );
  const lrsCap = parseOptionalNumber(String(formData.get("lrs_annual_cap_usd") ?? ""));

  const row = {
    family_id: session.familyId,
    cannot_trade_us_options: String(formData.get("cannot_trade_us_options") ?? "") === "1",
    monitor_per_week: parseNumberField(String(formData.get("monitor_per_week") ?? ""), {
      integer: true,
      min: 0,
      fallback: d.monitor_per_week,
    }),
    horizon_years: parseNumberField(String(formData.get("horizon_years") ?? ""), {
      min: 0.01,
      fallback: d.horizon_years,
    }),
    cash_reserve_pct_min: parseNumberField(
      String(formData.get("cash_reserve_pct_min") ?? ""),
      { min: 0, fallback: d.cash_reserve_pct_min },
    ),
    cash_reserve_pct_max: parseNumberField(
      String(formData.get("cash_reserve_pct_max") ?? ""),
      { min: 0, fallback: d.cash_reserve_pct_max },
    ),
    concentration_cap_pct: parseNumberField(
      String(formData.get("concentration_cap_pct") ?? ""),
      { min: 0.01, fallback: d.concentration_cap_pct },
    ),
    trim_to_pct: parseNumberField(String(formData.get("trim_to_pct") ?? ""), {
      min: 0.01,
      fallback: d.trim_to_pct,
    }),
    tranche_t1_pct: parseNumberField(String(formData.get("tranche_t1_pct") ?? ""), {
      min: 0,
      fallback: d.tranche_t1_pct,
    }),
    tranche_t2_pct: parseNumberField(String(formData.get("tranche_t2_pct") ?? ""), {
      min: 0,
      fallback: d.tranche_t2_pct,
    }),
    tranche_t3_pct: parseNumberField(String(formData.get("tranche_t3_pct") ?? ""), {
      min: 0,
      fallback: d.tranche_t3_pct,
    }),
    tranche_t4_pct: parseNumberField(String(formData.get("tranche_t4_pct") ?? ""), {
      min: 0,
      fallback: d.tranche_t4_pct,
    }),
    position_size_min_pct: parseNumberField(
      String(formData.get("position_size_min_pct") ?? ""),
      { min: 0, fallback: d.position_size_min_pct },
    ),
    position_size_max_pct: parseNumberField(
      String(formData.get("position_size_max_pct") ?? ""),
      { min: 0.01, fallback: d.position_size_max_pct },
    ),
    ltcg_holding_months: ltcgMonths,
    ltcg_rate_bps: parseNumberField(String(formData.get("ltcg_rate_bps") ?? ""), {
      integer: true,
      min: 0,
      fallback: d.ltcg_rate_bps,
    }),
    stcg_rate_bps: parseNumberField(String(formData.get("stcg_rate_bps") ?? ""), {
      integer: true,
      min: 0,
      fallback: d.stcg_rate_bps,
    }),
    outside_book: outsideBookFromForm(formData),
    lrs_enabled:
      loaded.residency === "india"
        ? String(formData.get("lrs_enabled") ?? "") === "1"
        : loaded.profile.lrs_enabled,
    lrs_annual_cap_usd: loaded.residency === "india" ? lrsCap : loaded.profile.lrs_annual_cap_usd,
    blackout_windows: blackoutsFromForm(formData),
    timezone: String(formData.get("timezone") ?? d.timezone).trim() || d.timezone,
  };

  if (row.cash_reserve_pct_max < row.cash_reserve_pct_min) {
    return { error: "Cash reserve max must be at least the min." };
  }
  if (row.position_size_max_pct < row.position_size_min_pct) {
    return { error: "Position size max must be at least the min." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("investor_profiles").upsert(row, {
    onConflict: "family_id",
  });
  if (error) {
    return { error: "Could not save investor_profiles." };
  }

  revalidatePath("/settings/profile");
  redirect("/settings/profile?ok=1");
}
