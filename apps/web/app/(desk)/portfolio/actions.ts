"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireDeskSession } from "@/lib/desk/session";
import { parsePortfolioCsv } from "@/lib/portfolio/csv";
import {
  canonicalTicker,
  guessExchange,
  parseCurrencyOverride,
  resolveNativeCurrency,
} from "@/lib/portfolio/exchange";
import { asDisplayCurrency } from "@/lib/portfolio/grid";
import { loadPortfolioSettings } from "@/lib/portfolio/load";
import { parseMoney, qtyFromTotals } from "@/lib/portfolio/qty";
import { createClient } from "@/lib/supabase/server";

export type PortfolioActionState = {
  error: string | null;
  notice: string | null;
};

export const EMPTY_PORTFOLIO_STATE: PortfolioActionState = {
  error: null,
  notice: null,
};

async function requirePortfolioId(familyId: string): Promise<string> {
  const settings = await loadPortfolioSettings(familyId);
  if (settings.portfolioId) return settings.portfolioId;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolios")
    .insert({ family_id: familyId, display_currency: "USD" })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new Error("Could not open a portfolio for this family.");
  }
  return String(data.id);
}

function revalidateDesk() {
  revalidatePath("/", "layout");
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

  const supabase = await createClient();
  const portfolioId = await requirePortfolioId(session.familyId);

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
  const rawTicker = String(formData.get("ticker") ?? "");
  const company = String(formData.get("company_name") ?? "").trim();
  const cost = parseMoney(String(formData.get("cost_per_share") ?? ""));
  const total = parseMoney(String(formData.get("total_purchased") ?? ""));
  const override = parseCurrencyOverride(String(formData.get("currency") ?? "auto"));

  const ticker = canonicalTicker(rawTicker);
  if (!ticker) {
    return { error: "Enter a ticker.", notice: null };
  }
  if (cost === null || cost <= 0) {
    return { error: "Cost per share must be greater than 0.", notice: null };
  }
  if (total === null || total <= 0) {
    return { error: "Total purchased must be greater than 0.", notice: null };
  }
  const qty = qtyFromTotals(total, cost);
  if (qty === null) {
    return { error: "Cannot derive qty from total purchased / cost.", notice: null };
  }

  const exchange = guessExchange(rawTicker);
  const native = resolveNativeCurrency(exchange, override);
  const supabase = await createClient();
  const portfolioId = await requirePortfolioId(session.familyId);

  const { error } = await supabase.from("holding_lots").insert({
    family_id: session.familyId,
    portfolio_id: portfolioId,
    ticker,
    exchange,
    company_name: company || ticker,
    qty,
    cost_per_share: cost,
    native_currency: native,
    source: "manual",
    created_by: session.userId,
  });

  if (error) {
    return { error: "Could not add that position.", notice: null };
  }

  revalidateDesk();
  redirect(`/portfolio?ok=manual&ticker=${encodeURIComponent(ticker)}`);
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
    fx = n;
  }

  const supabase = await createClient();
  const portfolioId = await requirePortfolioId(session.familyId);
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

export async function toggleDisplayCurrency() {
  const session = await requireDeskSession();
  const settings = await loadPortfolioSettings(session.familyId);
  const next = settings.displayCurrency === "USD" ? "INR" : "USD";
  const supabase = await createClient();
  const portfolioId = await requirePortfolioId(session.familyId);
  await supabase
    .from("portfolios")
    .update({ display_currency: next })
    .eq("id", portfolioId)
    .eq("family_id", session.familyId);
  revalidateDesk();
}
