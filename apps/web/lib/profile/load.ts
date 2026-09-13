import { createClient } from "@/lib/supabase/server";
import {
  parseBlackoutWindows,
  parseOutsideBook,
  parseTaxResidency,
  profileDefaults,
  type InvestorProfileKnobs,
  type TaxResidency,
} from "./defaults";

export type ProfileLoad =
  | {
      ok: true;
      missingTable: false;
      residency: TaxResidency;
      isOwner: boolean;
      profile: InvestorProfileKnobs;
    }
  | { ok: false; missingTable: true; error: string }
  | { ok: false; missingTable: false; error: string };

function isMissingTable(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("investor_profiles") &&
    (m.includes("does not exist") ||
      m.includes("schema cache") ||
      m.includes("could not find"))
  );
}

export async function loadInvestorProfile(
  familyId: string,
  userId: string,
): Promise<ProfileLoad> {
  const supabase = await createClient();

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("tax_residency")
    .eq("id", userId)
    .maybeSingle();
  if (userErr) {
    return { ok: false, missingTable: false, error: "Could not read residency." };
  }
  const residency = parseTaxResidency(
    userRow?.tax_residency ? String(userRow.tax_residency) : "us",
  );

  const { data: membership } = await supabase
    .from("family_members")
    .select("member_role")
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  const isOwner = membership?.member_role === "owner";

  const { data, error } = await supabase
    .from("investor_profiles")
    .select("*")
    .eq("family_id", familyId)
    .maybeSingle();

  if (error) {
    const msg = error.message ?? "";
    if (isMissingTable(msg)) {
      return {
        ok: false,
        missingTable: true,
        error:
          "Table investor_profiles is not on this database. No button applies it; owner/admin must run supabase/migrations/010_investor_profiles.sql with CONFIRM_APPLY=1 on the named DEV project.",
      };
    }
    return { ok: false, missingTable: false, error: "Could not read investor_profiles." };
  }

  const defaults = profileDefaults(residency);
  if (!data) {
    return { ok: true, missingTable: false, residency, isOwner, profile: defaults };
  }

  return {
    ok: true,
    missingTable: false,
    residency,
    isOwner,
    profile: {
      cannot_trade_us_options: Boolean(data.cannot_trade_us_options),
      monitor_per_week: Number(data.monitor_per_week ?? defaults.monitor_per_week),
      horizon_years: Number(data.horizon_years ?? defaults.horizon_years),
      cash_reserve_pct_min: Number(
        data.cash_reserve_pct_min ?? defaults.cash_reserve_pct_min,
      ),
      cash_reserve_pct_max: Number(
        data.cash_reserve_pct_max ?? defaults.cash_reserve_pct_max,
      ),
      concentration_cap_pct: Number(
        data.concentration_cap_pct ?? defaults.concentration_cap_pct,
      ),
      trim_to_pct: Number(data.trim_to_pct ?? defaults.trim_to_pct),
      tranche_t1_pct: Number(data.tranche_t1_pct ?? defaults.tranche_t1_pct),
      tranche_t2_pct: Number(data.tranche_t2_pct ?? defaults.tranche_t2_pct),
      tranche_t3_pct: Number(data.tranche_t3_pct ?? defaults.tranche_t3_pct),
      tranche_t4_pct: Number(data.tranche_t4_pct ?? defaults.tranche_t4_pct),
      position_size_min_pct: Number(
        data.position_size_min_pct ?? defaults.position_size_min_pct,
      ),
      position_size_max_pct: Number(
        data.position_size_max_pct ?? defaults.position_size_max_pct,
      ),
      ltcg_holding_months: Number(
        data.ltcg_holding_months ?? defaults.ltcg_holding_months,
      ),
      ltcg_rate_bps: Number(data.ltcg_rate_bps ?? defaults.ltcg_rate_bps),
      stcg_rate_bps: Number(data.stcg_rate_bps ?? defaults.stcg_rate_bps),
      outside_book: parseOutsideBook(data.outside_book),
      lrs_enabled: Boolean(data.lrs_enabled),
      lrs_annual_cap_usd:
        data.lrs_annual_cap_usd === null || data.lrs_annual_cap_usd === undefined
          ? null
          : Number(data.lrs_annual_cap_usd),
      blackout_windows: parseBlackoutWindows(data.blackout_windows),
      timezone: String(data.timezone ?? defaults.timezone),
    },
  };
}
