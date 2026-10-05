import {
  canonicalTicker,
  guessExchange,
  parseCurrencyOverride,
  resolveNativeCurrency,
  type CurrencyOverride,
} from "./exchange";
import { parseLotKindField, type LotKind } from "./lot-kind";
import { parseMoney, qtyFromTotals } from "./qty";

export type LotWriteFields = {
  ticker: string;
  company: string;
  exchange: string;
  native: ReturnType<typeof resolveNativeCurrency>;
  cost: number;
  total: number;
  qty: number;
  currencyOverride: CurrencyOverride;
  lotKind: LotKind;
};

function withKind(
  form: FormData,
  base: Omit<LotWriteFields, "lotKind">,
):
  | { ok: true; value: LotWriteFields }
  | { ok: false; error: string } {
  const kind = parseLotKindField(form.get("lot_kind"));
  if (!kind.ok) return kind;
  return { ok: true, value: { ...base, lotKind: kind.value } };
}

export function parseLotWrite(form: FormData):
  | { ok: true; value: LotWriteFields }
  | { ok: false; error: string } {
  const rawTicker = String(form.get("ticker") ?? "");
  const company = String(form.get("company_name") ?? "").trim();
  const cost = parseMoney(String(form.get("cost_per_share") ?? ""));
  const total = parseMoney(String(form.get("total_purchased") ?? ""));
  const override = parseCurrencyOverride(String(form.get("currency") ?? "auto"));

  const ticker = canonicalTicker(rawTicker);
  if (!ticker) {
    return { ok: false, error: "Enter a ticker." };
  }
  if (cost === null || cost <= 0) {
    return { ok: false, error: "Cost per share must be greater than 0." };
  }
  if (total === null || total <= 0) {
    return { ok: false, error: "Total purchased must be greater than 0." };
  }
  const qty = qtyFromTotals(total, cost);
  if (qty === null) {
    return { ok: false, error: "Cannot derive qty from total purchased / cost." };
  }

  const exchange = guessExchange(rawTicker);
  const native = resolveNativeCurrency(exchange, override);
  return withKind(form, {
    ticker,
    company: company || ticker,
    exchange,
    native,
    cost,
    total,
    qty,
    currencyOverride: override,
  });
}

export function parseLotId(raw: string): string | null {
  const id = raw.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  return id;
}

export type LotKey = {
  ticker: string;
  exchange: string;
  native: "USD" | "INR";
  lotKind: LotKind;
};

export function parseLotKey(form: FormData): LotKey | null {
  const ticker = canonicalTicker(String(form.get("orig_ticker") ?? ""));
  const exchange = String(form.get("orig_exchange") ?? "").trim();
  const nativeRaw = String(form.get("orig_native") ?? "")
    .trim()
    .toUpperCase();
  if (!ticker || !exchange) return null;
  if (nativeRaw !== "USD" && nativeRaw !== "INR") return null;
  const kind = parseLotKindField(form.get("orig_lot_kind"));
  if (!kind.ok) return null;
  return { ticker, exchange, native: nativeRaw, lotKind: kind.value };
}

/** Grid Edit: qty + cost per share + company. Does not apply FX. */
export function parseLotEdit(form: FormData):
  | { ok: true; value: LotWriteFields }
  | { ok: false; error: string } {
  const rawTicker = String(form.get("ticker") ?? "");
  const company = String(form.get("company_name") ?? "").trim();
  const cost = parseMoney(String(form.get("cost_per_share") ?? ""));
  const qty = parseMoney(String(form.get("qty") ?? ""));
  const override = parseCurrencyOverride(String(form.get("currency") ?? "auto"));

  const ticker = canonicalTicker(rawTicker);
  if (!ticker) {
    return { ok: false, error: "Enter a ticker." };
  }
  if (qty === null || qty <= 0) {
    return { ok: false, error: "Quantity must be greater than 0." };
  }
  if (cost === null || cost <= 0) {
    return { ok: false, error: "Cost per share must be greater than 0." };
  }

  const exchange = guessExchange(rawTicker);
  const native = resolveNativeCurrency(exchange, override);
  return withKind(form, {
    ticker,
    company: company || ticker,
    exchange,
    native,
    cost,
    total: qty * cost,
    qty,
    currencyOverride: override,
  });
}
