export type InfoTableRow = {
  issuer: string;
  cusip: string;
  titleOfClass: string;
  valueRaw: number;
  shares: number;
};

export type HoldingRow = {
  issuer: string;
  cusip: string;
  titleOfClass: string;
  valueUsd: number;
  shares: number;
  weightPct: number;
  ticker: string | null;
};

function tag(xml: string, name: string): string {
  const re = new RegExp(
    `<(?:[\\w]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w]+:)?${name}>`,
    "i",
  );
  const m = xml.match(re);
  return (m?.[1] ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function num(raw: string): number {
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function parseInfoTableXml(xml: string): InfoTableRow[] {
  if (!xml || typeof xml !== "string") return [];
  const blocks = xml.match(
    /<(?:[\w]+:)?infoTable\b[\s\S]*?<\/(?:[\w]+:)?infoTable>/gi,
  );
  if (!blocks) return [];
  const rows: InfoTableRow[] = [];
  for (const block of blocks) {
    const issuer = tag(block, "nameOfIssuer");
    const cusip = tag(block, "cusip").toUpperCase();
    if (!issuer && !cusip) continue;
    rows.push({
      issuer: issuer || "Unknown issuer",
      cusip,
      titleOfClass: tag(block, "titleOfClass"),
      valueRaw: num(tag(block, "value")),
      shares: num(tag(block, "sshPrnamt")),
    });
  }
  return rows;
}

/** Cover page as-of. Empty string if the tag is missing. */
export function parseReportQuarter(xml: string): string | null {
  const raw = tag(xml, "reportCalendarOrQuarter");
  if (!raw) return null;
  const mdy = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdy) {
    const [, mo, d, y] = mdy;
    return `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return raw.slice(0, 10);
}

export type SubmissionsRecent = {
  form: string[];
  accessionNumber: string[];
  primaryDocument: string[];
};

export type Latest13F = {
  accession: string;
  accessionNodash: string;
  primaryDocument: string;
  form: string;
};

export function latest13F(recent: SubmissionsRecent | null | undefined): Latest13F | null {
  if (!recent || !Array.isArray(recent.form)) return null;
  for (let i = 0; i < recent.form.length; i++) {
    const form = String(recent.form[i] ?? "");
    if (form !== "13F-HR" && form !== "13F-HR/A") continue;
    const accession = String(recent.accessionNumber[i] ?? "");
    if (!accession) continue;
    return {
      accession,
      accessionNodash: accession.replaceAll("-", ""),
      primaryDocument: String(recent.primaryDocument[i] ?? ""),
      form,
    };
  }
  return null;
}

export type DirectoryItem = { name?: string; type?: string; size?: string | number };

export function pickHoldingsXml(items: DirectoryItem[] | null | undefined): string | null {
  if (!Array.isArray(items)) return null;
  const xml = items
    .map((it) => String(it?.name ?? ""))
    .filter((name) => name.toLowerCase().endsWith(".xml"))
    .filter((name) => !/primary_doc|index|header/i.test(name));
  if (xml[0]) return xml[0];
  const fallback = items
    .map((it) => String(it?.name ?? ""))
    .find((name) => name.toLowerCase().endsWith(".xml") && /primary_doc/i.test(name));
  return fallback ?? null;
}

/**
 * 13F `value` was thousands of USD until mid-2023, then dollars.
 * A top-10 book in the trillions of USD is treated as thousands.
 */
export function valuesLookLikeThousands(totalValue: number): boolean {
  return totalValue >= 5_000_000_000_000;
}

export function rollupHoldings(rows: InfoTableRow[]): HoldingRow[] {
  const by = new Map<string, InfoTableRow>();
  for (const row of rows) {
    const key = row.cusip || row.issuer;
    const prev = by.get(key);
    if (!prev) {
      by.set(key, { ...row });
      continue;
    }
    prev.valueRaw += row.valueRaw;
    prev.shares += row.shares;
  }
  const merged = [...by.values()];
  const total = merged.reduce((s, r) => s + r.valueRaw, 0);
  const scale = valuesLookLikeThousands(total) ? 1000 : 1;
  const totalUsd = total * scale;
  return merged
    .map((r) => ({
      issuer: r.issuer,
      cusip: r.cusip,
      titleOfClass: r.titleOfClass,
      valueUsd: r.valueRaw * scale,
      shares: r.shares,
      weightPct: totalUsd > 0 ? (r.valueRaw * scale * 100) / totalUsd : 0,
      ticker: null,
    }))
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

export function filingArchiveUrl(cik: string, accessionNodash: string): string {
  const n = String(Number(cik));
  return `https://www.sec.gov/Archives/edgar/data/${n}/${accessionNodash}`;
}
