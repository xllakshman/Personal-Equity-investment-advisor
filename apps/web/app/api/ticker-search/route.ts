import { NextResponse } from "next/server";

import { getOptionalUser } from "@/lib/auth/session";
import { parseTickerSearch } from "@/lib/market/ticker-search";

const UA = "Mozilla/5.0 (compatible; eqveste-desk/1.0; +https://eqveste.com)";

export async function GET(request: Request) {
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1 || q.length > 32) {
    return NextResponse.json({ hits: [] });
  }
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`,
      {
        headers: { "User-Agent": UA },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      return NextResponse.json({ hits: [] });
    }
    return NextResponse.json({ hits: parseTickerSearch(await res.json()) });
  } catch {
    return NextResponse.json({ hits: [] });
  }
}
