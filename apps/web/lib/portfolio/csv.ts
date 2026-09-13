import {
  canonicalTicker,
  guessExchange,
  resolveNativeCurrency,
  type CurrencyOverride,
  type NativeCurrency,
} from "./exchange";
import { parseMoney, qtyFromTotals } from "./qty";

export const PORTFOLIO_CSV_COLUMNS = [
  "ticker",
  "company_name",
  "cost_per_share",
  "total_purchased",
] as const;

export type ParsedImportRow = {
  line: number;
  raw: Record<string, string>;
  ticker: string | null;
  company_name: string | null;
  cost_per_share: number | null;
  total_purchased: number | null;
  qty: number | null;
  exchange: string | null;
  native_currency: NativeCurrency | null;
  accepted: boolean;
  reject_reason: string | null;
};

export type CsvParseResult =
  | { ok: true; rows: ParsedImportRow[] }
  | { ok: false; error: string };

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "," && !inQuotes) || (ch === "\t" && !inQuotes)) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function headerIndex(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => {
    map.set(h.trim().toLowerCase(), i);
  });
  return map;
}

export function parsePortfolioCsv(
  text: string,
  override: CurrencyOverride = "auto",
): CsvParseResult {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return { ok: false, error: "CSV is empty." };
  }

  const lines = trimmed.split(/\r?\n/).filter((ln) => ln.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "CSV needs a header row and at least one data row." };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = headerIndex(headers);
  const missing = PORTFOLIO_CSV_COLUMNS.filter((c) => !idx.has(c));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `CSV header must include ${PORTFOLIO_CSV_COLUMNS.join(", ")}. Missing: ${missing.join(", ")}.`,
    };
  }

  const rows: ParsedImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const raw: Record<string, string> = {};
    for (const col of PORTFOLIO_CSV_COLUMNS) {
      raw[col] = cells[idx.get(col)!] ?? "";
    }

    const tickerCell = raw.ticker.trim();
    const companyCell = raw.company_name.trim();
    const cost = parseMoney(raw.cost_per_share);
    const total = parseMoney(raw.total_purchased);

    let reject: string | null = null;
    if (!tickerCell) reject = "Blank ticker";
    else if (cost === null) reject = "Cost per share must be a number";
    else if (cost <= 0) reject = "Cost per share must be greater than 0";
    else if (total === null) reject = "Total purchased must be a number";
    else if (total <= 0) reject = "Total purchased must be greater than 0";

    const qty = reject ? null : qtyFromTotals(total!, cost!);
    if (!reject && (qty === null || qty <= 0)) {
      reject = "Cannot derive qty from total_purchased / cost_per_share";
    }

    const ticker = tickerCell ? canonicalTicker(tickerCell) : null;
    const exchange = tickerCell ? guessExchange(tickerCell) : null;
    const native =
      exchange && !reject ? resolveNativeCurrency(exchange, override) : null;

    rows.push({
      line: i + 1,
      raw,
      ticker: reject ? ticker : ticker!,
      company_name: companyCell || ticker,
      cost_per_share: cost,
      total_purchased: total,
      qty,
      exchange,
      native_currency: native,
      accepted: reject === null,
      reject_reason: reject,
    });
  }

  return { ok: true, rows };
}
