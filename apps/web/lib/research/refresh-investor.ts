import { eliteBySlug, type EliteCatalogRow } from "./elite-catalog";
import { periodReturns, parseMonthlyCloses } from "./cagr";
import { emptyBook } from "./elite-types";
import type { EliteInvestorBook } from "./elite-types";
import {
  matchTicker,
  parseSecCompanyTickers,
  type TickerCatalogEntry,
} from "./issuer-ticker";
import {
  filingArchiveUrl,
  latest13F,
  parseInfoTableXml,
  parseReportQuarter,
  pickHoldingsXml,
  rollupHoldings,
  type DirectoryItem,
  type HoldingRow,
  type SubmissionsRecent,
} from "./sec-13f";

const SEC_UA = "eqveste-desk/1.0 (research@eqveste.com)";
const YAHOO_UA = "Mozilla/5.0 (compatible; eqveste-desk/1.0; +https://eqveste.com)";

async function getJson(
  url: string,
  ua: string,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const res = await fetchImpl(url, {
    headers: { "User-Agent": ua, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function getText(
  url: string,
  ua: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const res = await fetchImpl(url, {
    headers: { "User-Agent": ua, Accept: "application/xml,text/xml,*/*" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}

export async function fetchVehicleReturns(
  ticker: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReturnType<typeof periodReturns>> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=10y&interval=1mo`;
  const res = await fetchImpl(url, {
    headers: { "User-Agent": YAHOO_UA },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return { y1: null, y3: null, y5: null, y10: null, asOf: null };
  return periodReturns(parseMonthlyCloses(await res.json()));
}

export async function refreshInvestor(
  slug: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EliteInvestorBook> {
  const row = eliteBySlug(slug);
  if (!row) {
    return {
      ...emptyBook({
        slug,
        name: slug,
        firm: "",
        cik: null,
        vehicleTicker: null,
        vehicleNote: "",
      }),
      error: "Unknown investor.",
    };
  }
  const book = emptyBook(row);
  book.holdingsNote = null;
  const errors: string[] = [];

  if (row.vehicleTicker) {
    try {
      const ret = await fetchVehicleReturns(row.vehicleTicker, fetchImpl);
      book.returns = { ...book.returns, ...ret, vehicleTicker: row.vehicleTicker };
    } catch {
      errors.push("Yahoo chart for the listed vehicle did not return.");
    }
  }

  if (row.cik) {
    try {
      const filings = await pull13F(row, fetchImpl);
      book.filingAsOf = filings.asOf;
      book.filingUrl = filings.url;
      book.holdings = await attachTickers(filings.holdings, fetchImpl);
      if (filings.holdings.length === 0) {
        book.holdingsNote = "Latest 13F had no parseable information table.";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "13F fetch failed";
      errors.push(
        msg.includes("404")
          ? "SEC has no current 13F for this CIK."
          : "SEC EDGAR did not return a 13F just now.",
      );
      book.holdingsNote = errors[errors.length - 1] ?? null;
    }
  }

  book.refreshedAt = new Date().toISOString();
  book.error = errors[0] ?? null;
  return book;
}

let tickerCatalog: TickerCatalogEntry[] | null = null;

async function loadTickerCatalog(
  fetchImpl: typeof fetch,
): Promise<TickerCatalogEntry[]> {
  if (tickerCatalog) return tickerCatalog;
  try {
    const raw = await getJson(
      "https://www.sec.gov/files/company_tickers.json",
      SEC_UA,
      fetchImpl,
    );
    tickerCatalog = parseSecCompanyTickers(raw);
  } catch {
    tickerCatalog = [];
  }
  return tickerCatalog;
}

async function attachTickers(
  holdings: HoldingRow[],
  fetchImpl: typeof fetch,
): Promise<HoldingRow[]> {
  const catalog = await loadTickerCatalog(fetchImpl);
  return holdings.map((h) => ({
    ...h,
    ticker: matchTicker(h.issuer, catalog, h.cusip),
  }));
}

async function pull13F(
  row: EliteCatalogRow,
  fetchImpl: typeof fetch,
): Promise<{
  asOf: string | null;
  url: string | null;
  holdings: ReturnType<typeof rollupHoldings>;
}> {
  const cik = row.cik!;
  const sub = (await getJson(
    `https://data.sec.gov/submissions/CIK${cik}.json`,
    SEC_UA,
    fetchImpl,
  )) as { filings?: { recent?: SubmissionsRecent } };
  const latest = latest13F(sub.filings?.recent);
  if (!latest) {
    throw new Error("no 13F-HR");
  }
  const base = filingArchiveUrl(cik, latest.accessionNodash);
  const index = (await getJson(`${base}/index.json`, SEC_UA, fetchImpl)) as {
    directory?: { item?: DirectoryItem[] };
  };
  const holdingsName = pickHoldingsXml(index.directory?.item);
  let asOf: string | null = null;
  try {
    const coverName = latest.primaryDocument.split("/").pop() || "primary_doc.xml";
    const cover = await getText(`${base}/${coverName}`, SEC_UA, fetchImpl);
    asOf = parseReportQuarter(cover);
  } catch {
    asOf = null;
  }
  if (!holdingsName) {
    return { asOf, url: `${base}/`, holdings: [] };
  }
  const xml = await getText(`${base}/${holdingsName}`, SEC_UA, fetchImpl);
  return {
    asOf,
    url: `${base}/${holdingsName}`,
    holdings: rollupHoldings(parseInfoTableXml(xml)),
  };
}
