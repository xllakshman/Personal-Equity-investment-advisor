import {
  canonicalTicker,
  guessExchange,
  resolveNativeCurrency,
  type CurrencyOverride,
  type NativeCurrency,
} from "./exchange";
import { parseLotKindField, type LotKind } from "./lot-kind";
import { parseMoney, qtyFromTotals } from "./qty";

export const PORTFOLIO_CSV_COLUMNS = [
  "ticker",
  "company_name",
  "cost_per_share",
  "total_purchased",
] as const;

/** Parsed when present; missing or blank lot_kind = retail. */
export const PORTFOLIO_CSV_OPTIONAL_COLUMNS = ["lot_kind"] as const;

export const PORTFOLIO_CSV_TEMPLATE_FILENAME = "eqveste-holdings-template.csv";

export function csvTemplateHeader(): string {
  return [...PORTFOLIO_CSV_COLUMNS, ...PORTFOLIO_CSV_OPTIONAL_COLUMNS].join(",");
}

export function csvTemplateText(): string {
  return [
    `# Required: ${PORTFOLIO_CSV_COLUMNS.join(", ")}`,
    `# Optional: ${PORTFOLIO_CSV_OPTIONAL_COLUMNS.join(", ")} (lot_kind blank = retail)`,
    `# Lines starting with # are ignored. Currency is the upload control, not a column.`,
    csvTemplateHeader(),
    "MSFT,Microsoft,400,4000,retail",
    "INFY.NS,Infosys,1500,150000,",
    "",
  ].join("\n");
}

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
  lot_kind: LotKind;
  accepted: boolean;
  reject_reason: string | null;
};

export type CsvParseResult =
  | { ok: true; rows: ParsedImportRow[] }
  | { ok: false; error: string };

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Header line only — quoted commas must not flip the delimiter. */
export function detectCsvDelimiter(headerLine: string): "," | ";" | "\t" {
  let commas = 0;
  let semis = 0;
  let tabs = 0;
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i++) {
    const ch = headerLine[i];
    if (ch === '"') {
      if (inQuotes && headerLine[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (inQuotes) continue;
    if (ch === ",") commas += 1;
    else if (ch === ";") semis += 1;
    else if (ch === "\t") tabs += 1;
  }
  if (tabs > commas && tabs > semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
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
    } else if (ch === delimiter && !inQuotes) {
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
    map.set(normalizeHeader(h), i);
  });
  return map;
}

export async function csvTextFromFormData(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (file instanceof Blob && file.size > 0 && typeof file.text === "function") {
    return file.text();
  }
  return String(formData.get("csv") ?? "");
}

export function parsePortfolioCsv(
  text: string,
  override: CurrencyOverride = "auto",
): CsvParseResult {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return { ok: false, error: "CSV is empty." };
  }

  const lines = trimmed.split(/\r?\n/).filter((ln) => {
    const t = ln.trim();
    return t.length > 0 && !t.startsWith("#");
  });
  if (lines.length < 2) {
    return { ok: false, error: "CSV needs a header row and at least one data row." };
  }

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
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
    const cells = splitCsvLine(lines[i], delimiter);
    const raw: Record<string, string> = {};
    for (const col of PORTFOLIO_CSV_COLUMNS) {
      raw[col] = cells[idx.get(col)!] ?? "";
    }

    const tickerCell = raw.ticker.trim();
    const companyCell = raw.company_name.trim();
    const cost = parseMoney(raw.cost_per_share);
    const total = parseMoney(raw.total_purchased);
    const kindCell = idx.has("lot_kind") ? (cells[idx.get("lot_kind")!] ?? "").trim() : "";
    raw.lot_kind = kindCell;
    const kindParsed = parseLotKindField(kindCell);

    let reject: string | null = null;
    if (!tickerCell) reject = "Blank ticker";
    else if (cost === null) reject = "Cost per share must be a number";
    else if (cost <= 0) reject = "Cost per share must be greater than 0";
    else if (total === null) reject = "Total purchased must be a number";
    else if (total <= 0) reject = "Total purchased must be greater than 0";
    else if (!kindParsed.ok) reject = "lot_kind must be retail or esop";

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
      lot_kind: kindParsed.ok ? kindParsed.value : "retail",
      accepted: reject === null,
      reject_reason: reject,
    });
  }

  return { ok: true, rows };
}
