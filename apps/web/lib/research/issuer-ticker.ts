export type TickerCatalogEntry = { title: string; ticker: string };

const NOISE =
  /\b(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|PLC|SA|NV|AG|LP|LLP|LLC|THE|CLASS|CL|COM|COMMON|STOCK|ORD|SHS|ADR|ADS|NEW)\b/g;

export function normalizeIssuer(name: string): string {
  return String(name ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSecCompanyTickers(raw: unknown): TickerCatalogEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const out: TickerCatalogEntry[] = [];
  const seen = new Set<string>();
  for (const value of Object.values(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const row = value as { ticker?: unknown; title?: unknown };
    const ticker = String(row.ticker ?? "")
      .trim()
      .toUpperCase()
      .replaceAll("-", ".");
    const title = String(row.title ?? "").trim();
    if (!ticker || !title || seen.has(ticker)) continue;
    seen.add(ticker);
    out.push({ title, ticker });
  }
  return out;
}

export function matchTicker(
  issuer: string,
  catalog: TickerCatalogEntry[],
  cusip?: string,
): string | null {
  if (cusip) {
    const byCusip = catalog.find(
      (c) => normalizeIssuer(c.title) === normalizeIssuer(cusip),
    );
    if (byCusip) return byCusip.ticker;
  }
  const n = normalizeIssuer(issuer);
  if (!n || !catalog.length) return null;
  const exact = catalog.filter((c) => normalizeIssuer(c.title) === n);
  if (exact.length === 1) return exact[0]!.ticker;
  if (exact.length > 1) {
    const com = exact.find((c) => !c.ticker.endsWith(".A") && c.ticker.includes("."));
    return com?.ticker ?? exact[0]!.ticker;
  }
  const prefix = catalog.filter((c) => {
    const t = normalizeIssuer(c.title);
    return t.startsWith(n) || n.startsWith(t);
  });
  if (prefix.length === 1) return prefix[0]!.ticker;
  return null;
}

export function eliteMatchWatch(
  name: string,
  rows: readonly { slug: string; name: string; firm: string }[],
): { slug: string; name: string; firm: string } | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  const exact = rows.find(
    (e) =>
      e.name.toLowerCase() === n ||
      e.firm.toLowerCase() === n ||
      e.slug === n,
  );
  if (exact) return exact;
  const hits = rows.filter(
    (e) => e.name.toLowerCase().includes(n) || e.firm.toLowerCase().includes(n),
  );
  return hits.length === 1 ? hits[0]! : null;
}
