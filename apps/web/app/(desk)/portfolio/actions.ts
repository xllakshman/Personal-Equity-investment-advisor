"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canWriteFamily, requireDeskSession } from "@/lib/desk/session";
import { parsePortfolioCsv } from "@/lib/portfolio/csv";
import { parseCurrencyOverride } from "@/lib/portfolio/exchange";
import { asDisplayCurrency } from "@/lib/portfolio/grid";
import { roundUsdInr } from "@/lib/portfolio/fx";
import { loadPortfolioSettings } from "@/lib/portfolio/load";
import { parseLotId, parseLotWrite } from "@/lib/portfolio/lot-write";
import { createClient } from "@/lib/supabase/server";

export type PortfolioActionState = {
  error: string | null;
  notice: string | null;
};

export const EMPTY_PORTFOLIO_STATE: PortfolioActionState = {
  error: null,
  notice: null,
};

function safeReturnPath(raw: string): string {
  const path = raw.trim().split("?")[0] ?? "";
  if (path === "/desk" || path === "/portfolio") return path;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return "/desk";
  }
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

export async function commitCsvImport(
  _prev: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const session = await requireDeskSession();
  const csv = String(formData.get("csv") ?? "");
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
    }));

  if (lots.length > 0) {
    const { error: lotErr } = await supabase.from("holding_lots").insert(lots);
    if (lotErr) {
      return { error: "Could not insert lots.", notice: null };
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

  const { error } = await supabase.from("holding_lots").insert({
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
  });

  if (error) {
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
  const { data, error } = await supabase
    .from("holding_lots")
    .update({
      ticker: parsed.value.ticker,
      exchange: parsed.value.exchange,
      company_name: parsed.value.company,
      qty: parsed.value.qty,
      cost_per_share: parsed.value.cost,
      native_currency: parsed.value.native,
    })
    .eq("id", lotId)
    .eq("family_id", session.familyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Could not save that position.", notice: null };
  }
  if (!data?.id) {
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
