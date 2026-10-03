import {
  canonicalTicker,
  guessExchange,
  parseCurrencyOverride,
  resolveNativeCurrency,
  type CurrencyOverride,
} from "./exchange";
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
};

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
  return {
    ok: true,
    value: {
      ticker,
      company: company || ticker,
      exchange,
      native,
      cost,
      total,
      qty,
      currencyOverride: override,
    },
  };
}

export function parseLotId(raw: string): string | null {
  const id = raw.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  return id;
}
