import { NextResponse } from "next/server";

import { getOptionalUser } from "@/lib/auth/session";
import { parsePreviousClose, yahooSymbol } from "@/lib/market/yahoo-symbol";
import { guessExchange } from "@/lib/portfolio/exchange";

const UA = "Mozilla/5.0 (compatible; eqveste-desk/1.0; +https://eqveste.com)";

function parseItems(raw: string): { ticker: string; exchange: string }[] {
  return raw
    .split(",")
    .map((part) => {
      const [t, ex] = part.split(":");
      const ticker = (t ?? "").trim().toUpperCase();
      if (!ticker) return null;
      return { ticker, exchange: (ex ?? "").trim() || guessExchange(ticker) };
    })
    .filter((x): x is { ticker: string; exchange: string } => x != null)
    .slice(0, 20);
}

/** Browser-only. Desk RSC must not call this on `/desk` load (D40). */
export async function GET(request: Request) {
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const items = parseItems(new URL(request.url).searchParams.get("items") ?? "");
  const quotes: Record<string, { close: number; currency: string } | null> = {};
  await Promise.all(
    items.map(async ({ ticker, exchange }) => {
      const symbol = yahooSymbol(ticker, exchange);
      if (!symbol) {
        quotes[ticker] = null;
        return;
      }
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
          {
            headers: { "User-Agent": UA },
            next: { revalidate: 300 },
            signal: AbortSignal.timeout(8000),
          },
        );
        if (!res.ok) {
          quotes[ticker] = null;
          return;
        }
        const parsed = parsePreviousClose(await res.json(), symbol);
        quotes[ticker] = parsed
          ? { close: parsed.close, currency: parsed.currency }
          : null;
      } catch {
        quotes[ticker] = null;
      }
    }),
  );
  return NextResponse.json({ quotes });
}
