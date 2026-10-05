"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canWriteFamily, requireDeskSession } from "@/lib/desk/session";
import { csvTextFromFormData, parsePortfolioCsv } from "@/lib/portfolio/csv";
import { parseCurrencyOverride } from "@/lib/portfolio/exchange";
import { asDisplayCurrency } from "@/lib/portfolio/grid";
import { roundUsdInr } from "@/lib/portfolio/fx";
import { loadPortfolioSettings } from "@/lib/portfolio/load";
import {
  missingLotKindColumn,
  writeWithOptionalLotKind,
} from "@/lib/portfolio/lot-kind";
import { loadInvestorProfile } from "@/lib/profile/load";
import { parseLotId, parseLotEdit, parseLotKey, parseLotWrite } from "@/lib/portfolio/lot-write";
import { parseEntryTranches } from "@/lib/profile/tranches";
import { type PortfolioActionState } from "@/lib/portfolio/action-state";
import { createClient } from "@/lib/supabase/server";

function safeReturnPath(raw: string): string {
  const path = raw.trim().split("?")[0] ?? "";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return "/desk";
  }
  const allowed = [
    "/desk",
    "/portfolio",
    "/analyse",
    "/reports",
    "/billing",
    "/subscription",
    "/settings",
    "/research",
    "/contact",
    "/usage",
  ];
  if (allowed.some((p) => path === p || path.startsWith(`${p}/`))) return path;
  return "/desk";
}

const VIEWER_WRITE_ERROR = "Viewers can read this book but cannot change lots.";

async function requirePortfolioId(familyId: string): Promise<string | null> {
  const settings = await loadPortfolioSettings(familyId);
  if (settings.portfolioId) return settings.portfolioId;

  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolios")
    .insert({ family_id: familyId, display_currency: "USD" })
    .select("id")
    .maybeSingle();
  if (data?.id) return String(data.id);

  const again = await loadPortfolioSettings(familyId);
  return again.portfolioId;
}

function revalidateDesk() {
  revalidatePath("/desk");
  revalidatePath("/portfolio");
  revalidatePath("/analyse");
}

async function deleteRejectedImportRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyId: string,
) {
  await supabase
    .from("portfolio_import_rows")
    .delete()
    .eq("family_id", familyId)
    .eq("accepted", false);
}

/** Owner/member DELETE `portfolio_import_rows` where accepted = false, then `/portfolio` with no query. */
export async function dismissRejectedImports() {
  const session = await requireDeskSession();
  if (canWriteFamily(session)) {
    const supabase = await createClient();
    await deleteRejectedImportRows(supabase, session.familyId);
  }
  revalidatePath("/portfolio");
  redirect("/portfolio");
}

type LotRow = {
  family_id: string;
  portfolio_id: string;
  ticker: string;
  exchange: string;
  company_name: string;
  qty: number;
  cost_per_share: number;
  native_currency: string;
  source: "csv" | "manual";
  created_by: string;
  lot_kind: "retail" | "esop";
};

async function insertLots(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lots: LotRow[],
): Promise<{ error: string | null }> {
  const result = await writeWithOptionalLotKind(lots, (payload) =>
    supabase.from("holding_lots").insert(payload),
  );
  if (result.error) return { error: "Could not insert lots." };
  return { error: null };
}

async function updateLotById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyId: string,
  lotId: string,
  patch: Record<string, unknown> & { lot_kind: "retail" | "esop" },
): Promise<{ id: string | null; error: string | null }> {
  const withKind = await supabase
    .from("holding_lots")
    .update(patch)
    .eq("id", lotId)
    .eq("family_id", familyId)
    .select("id")
    .maybeSingle();
  if (!withKind.error) {
    return { id: withKind.data?.id ? String(withKind.data.id) : null, error: null };
  }
  if (!missingLotKindColumn(withKind.error)) {
    return { id: null, error: "Could not save that position." };
  }
  const { lot_kind: _ignored, ...rest } = patch;
  const without = await supabase
    .from("holding_lots")
    .update(rest)
    .eq("id", lotId)
    .eq("family_id", familyId)
    .select("id")
    .maybeSingle();
  if (without.error) return { id: null, error: "Could not save that position." };
  return { id: without.data?.id ? String(without.data.id) : null, error: null };
}

export async function commitCsvImport(
  _prev: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const session = await requireDeskSession();
  const csv = await csvTextFromFormData(formData);
  const override = parseCurrencyOverride(String(formData.get("currency") ?? "auto"));
  const replace = String(formData.get("replace") ?? "") === "1";

  const parsed = parsePortfolioCsv(csv, override);
  if (!parsed.ok) {
    return { error: parsed.error, notice: null };
  }
  if (parsed.rows.length === 0) {
    return { error: "CSV has no data rows.", notice: null };
  }

  if (!canWriteFamily(session)) {
    return { error: VIEWER_WRITE_ERROR, notice: null };
  }

  const supabase = await createClient();
  const portfolioId = await requirePortfolioId(session.familyId);
  if (!portfolioId) {
    return { error: "Could not open a portfolio for this family.", notice: null };
  }

  if (replace) {
    const { error: delErr } = await supabase
      .from("holding_lots")
      .delete()
      .eq("family_id", session.familyId);
    if (delErr) {
      return { error: "Could not replace existing lots.", notice: null };
    }
  }

  await deleteRejectedImportRows(supabase, session.familyId);

  const importPayload = parsed.rows.map((row) => ({
    family_id: session.familyId,
    portfolio_id: portfolioId,
    raw: row.raw,
    ticker: row.ticker,
    company_name: row.company_name,
    cost_per_share: row.cost_per_share,
    total_purchased: row.total_purchased,
    accepted: row.accepted,
    reject_reason: row.reject_reason,
  }));

  const { error: importErr } = await supabase
    .from("portfolio_import_rows")
    .insert(importPayload);
  if (importErr) {
    return { error: "Could not record import rows.", notice: null };
  }

  const lots = parsed.rows
    .filter((r) => r.accepted && r.ticker && r.qty && r.cost_per_share !== null)
    .map((r) => ({
      family_id: session.familyId,
      portfolio_id: portfolioId,
      ticker: r.ticker!,
      exchange: r.exchange ?? "NASDAQ",
      company_name: r.company_name || r.ticker!,
      qty: r.qty!,
      cost_per_share: r.cost_per_share!,
      native_currency: r.native_currency ?? "USD",
      source: "csv" as const,
      created_by: session.userId,
      lot_kind: r.lot_kind,
    }));

  if (lots.length > 0) {
    const inserted = await insertLots(supabase, lots);
    if (inserted.error) {
      return { error: inserted.error, notice: null };
    }
  }

  const rejected = parsed.rows.filter((r) => !r.accepted).length;
  revalidateDesk();
  redirect(
    `/portfolio?ok=csv&accepted=${lots.length}&rejected=${rejected}${replace ? "&replaced=1" : ""}`,
  );
}

export async function addManualLot(
  _prev: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const session = await requireDeskSession();
  if (!canWriteFamily(session)) {
    return { error: VIEWER_WRITE_ERROR, notice: null };
  }
  const parsed = parseLotWrite(formData);
  if (!parsed.ok) {
    return { error: parsed.error, notice: null };
  }

  const supabase = await createClient();
  const portfolioId = await requirePortfolioId(session.familyId);
  if (!portfolioId) {
    return { error: "Could not open a portfolio for this family.", notice: null };
  }

  const inserted = await insertLots(supabase, [
    {
      family_id: session.familyId,
      portfolio_id: portfolioId,
      ticker: parsed.value.ticker,
      exchange: parsed.value.exchange,
      company_name: parsed.value.company,
      qty: parsed.value.qty,
      cost_per_share: parsed.value.cost,
      native_currency: parsed.value.native,
      source: "manual",
      created_by: session.userId,
      lot_kind: parsed.value.lotKind,
    },
  ]);

  if (inserted.error) {
    return { error: "Could not add that position.", notice: null };
  }

  revalidateDesk();
  const back = safeReturnPath(String(formData.get("returnTo") ?? "/portfolio"));
  redirect(`${back}?ok=manual&ticker=${encodeURIComponent(parsed.value.ticker)}`);
}

export async function updateHoldingLot(
  _prev: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const session = await requireDeskSession();
  if (!canWriteFamily(session)) {
    return { error: VIEWER_WRITE_ERROR, notice: null };
  }
  const lotId = parseLotId(String(formData.get("lotId") ?? ""));
  if (!lotId) {
    return { error: "That position could not be found.", notice: null };
  }
  const parsed = parseLotWrite(formData);
  if (!parsed.ok) {
    return { error: parsed.error, notice: null };
  }

  const supabase = await createClient();
  const saved = await updateLotById(supabase, session.familyId, lotId, {
    ticker: parsed.value.ticker,
    exchange: parsed.value.exchange,
    company_name: parsed.value.company,
    qty: parsed.value.qty,
    cost_per_share: parsed.value.cost,
    native_currency: parsed.value.native,
    lot_kind: parsed.value.lotKind,
  });

  if (saved.error) {
    return { error: saved.error, notice: null };
  }
  if (!saved.id) {
    return { error: "That position could not be found.", notice: null };
  }

  revalidateDesk();
  const back = safeReturnPath(String(formData.get("returnTo") ?? "/desk"));
  redirect(`${back}?ok=edit&ticker=${encodeURIComponent(parsed.value.ticker)}`);
}

export async function deleteHoldingLot(formData: FormData) {
  const session = await requireDeskSession();
  const back = safeReturnPath(String(formData.get("returnTo") ?? "/desk"));
  if (!canWriteFamily(session)) {
    redirect(`${back}?ok=denied`);
  }
  const lotId = parseLotId(String(formData.get("lotId") ?? ""));
  if (!lotId) {
    redirect(`${back}?ok=missing`);
  }
  const supabase = await createClient();
  await supabase
    .from("holding_lots")
    .delete()
    .eq("id", lotId)
    .eq("family_id", session.familyId);
  revalidateDesk();
  redirect(`${back}?ok=deleted`);
}

export async function updateHoldingTicker(
  _prev: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const session = await requireDeskSession();
  if (!canWriteFamily(session)) {
    return { error: VIEWER_WRITE_ERROR, notice: null };
  }
  const key = parseLotKey(formData);
  if (!key) {
    return { error: "That name could not be found.", notice: null };
  }
  const parsed = parseLotEdit(formData);
  if (!parsed.ok) {
    return { error: parsed.error, notice: null };
  }

  const supabase = await createClient();
  const withKind = await supabase
    .from("holding_lots")
    .select("id, portfolio_id")
    .eq("family_id", session.familyId)
    .eq("ticker", key.ticker)
    .eq("exchange", key.exchange)
    .eq("native_currency", key.native)
    .eq("lot_kind", key.lotKind)
    .order("created_at", { ascending: true });
  let lots = withKind.data;
  let readErr = withKind.error;
  if (readErr && missingLotKindColumn(readErr)) {
    const without = await supabase
      .from("holding_lots")
      .select("id, portfolio_id")
      .eq("family_id", session.familyId)
      .eq("ticker", key.ticker)
      .eq("exchange", key.exchange)
      .eq("native_currency", key.native)
      .order("created_at", { ascending: true });
    lots = without.data;
    readErr = without.error;
  }
  if (readErr || !lots?.length) {
    return { error: "That name could not be found.", notice: null };
  }

  const keepId = String(lots[0].id);
  const extraIds = lots.slice(1).map((row) => String(row.id));
  const exchange =
    parsed.value.ticker === key.ticker ? key.exchange : parsed.value.exchange;

  const saved = await updateLotById(supabase, session.familyId, keepId, {
    ticker: parsed.value.ticker,
    exchange,
    company_name: parsed.value.company,
    qty: parsed.value.qty,
    cost_per_share: parsed.value.cost,
    native_currency: parsed.value.native,
    lot_kind: parsed.value.lotKind,
  });
  if (saved.error || !saved.id) {
    return { error: "Could not save that position.", notice: null };
  }
  if (extraIds.length > 0) {
    const { error: delErr } = await supabase
      .from("holding_lots")
      .delete()
      .eq("family_id", session.familyId)
      .in("id", extraIds);
    if (delErr) {
      return { error: "Could not save that position.", notice: null };
    }
  }

  revalidateDesk();
  const back = safeReturnPath(String(formData.get("returnTo") ?? "/portfolio"));
  redirect(`${back}?ok=edit&ticker=${encodeURIComponent(parsed.value.ticker)}`);
}

export async function deleteHoldingTicker(formData: FormData) {
  const session = await requireDeskSession();
  const back = safeReturnPath(String(formData.get("returnTo") ?? "/portfolio"));
  if (!canWriteFamily(session)) {
    redirect(`${back}?ok=denied`);
  }
  const key = parseLotKey(formData);
  if (!key) {
    redirect(`${back}?ok=missing`);
  }
  const supabase = await createClient();
  const withKind = await supabase
    .from("holding_lots")
    .delete()
    .eq("family_id", session.familyId)
    .eq("ticker", key.ticker)
    .eq("exchange", key.exchange)
    .eq("native_currency", key.native)
    .eq("lot_kind", key.lotKind);
  if (withKind.error && missingLotKindColumn(withKind.error)) {
    await supabase
      .from("holding_lots")
      .delete()
      .eq("family_id", session.familyId)
      .eq("ticker", key.ticker)
      .eq("exchange", key.exchange)
      .eq("native_currency", key.native);
  }
  revalidateDesk();
  redirect(`${back}?ok=deleted`);
}

export async function saveDisplaySettings(
  _prev: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const session = await requireDeskSession();
  const display = asDisplayCurrency(String(formData.get("display_currency") ?? "USD"));
  const fxRaw = String(formData.get("fx_usd_inr_override") ?? "").trim();
  let fx: number | null = null;
  if (fxRaw) {
    const n = Number(fxRaw);
    if (!Number.isFinite(n) || n <= 0) {
      return { error: "USD → INR rate must be greater than 0.", notice: null };
    }
    fx = roundUsdInr(n);
  }

  const supabase = await createClient();
  const portfolioId = await requirePortfolioId(session.familyId);
  if (!portfolioId) {
    return { error: "Could not open a portfolio for this family.", notice: null };
  }
  const { error } = await supabase
    .from("portfolios")
    .update({
      display_currency: display,
      fx_usd_inr_override: fx,
    })
    .eq("id", portfolioId)
    .eq("family_id", session.familyId);

  if (error) {
    return { error: "Could not save display currency.", notice: null };
  }

  revalidateDesk();
  redirect("/portfolio?ok=fx");
}

export async function toggleDisplayCurrency(formData: FormData) {
  const session = await requireDeskSession();
  const back = safeReturnPath(String(formData.get("returnTo") ?? "/desk"));
  try {
    const settings = await loadPortfolioSettings(session.familyId);
    const next = settings.displayCurrency === "USD" ? "INR" : "USD";
    const supabase = await createClient();
    const portfolioId = await requirePortfolioId(session.familyId);
    if (!portfolioId) {
      redirect(back);
    }
    const { error } = await supabase
      .from("portfolios")
      .update({ display_currency: next })
      .eq("id", portfolioId)
      .eq("family_id", session.familyId);
    if (error) {
      redirect(back);
    }
    revalidateDesk();
  } catch {
    redirect(back);
  }
  redirect(back);
}

export async function saveEntryTranches(
  _prev: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const session = await requireDeskSession();
  const loaded = await loadInvestorProfile(session.familyId, session.userId);
  if (!loaded.ok) {
    return { error: loaded.error, notice: null };
  }
  if (!loaded.isOwner) {
    return { error: "Only the family owner can save entry tranches.", notice: null };
  }
  const parsed = parseEntryTranches(formData);
  if (!parsed.ok) {
    return { error: parsed.error, notice: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("investor_profiles").upsert(
    {
      family_id: session.familyId,
      tranche_t1_pct: parsed.value.tranche_t1_pct,
      tranche_t2_pct: parsed.value.tranche_t2_pct,
      tranche_t3_pct: parsed.value.tranche_t3_pct,
      tranche_t4_pct: parsed.value.tranche_t4_pct,
    },
    { onConflict: "family_id" },
  );
  if (error) {
    return { error: "Could not save investor_profiles entry tranches.", notice: null };
  }

  revalidatePath("/portfolio");
  revalidatePath("/analyse");
  revalidatePath("/settings/profile");
  return {
    error: null,
    notice:
      "Saved. The next Analyse Submit sends T1–T4 in the pack the worker reads from investor_profiles.",
  };
}
