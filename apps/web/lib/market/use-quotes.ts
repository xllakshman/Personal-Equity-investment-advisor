"use client";

import { useEffect, useState } from "react";

import type { QuotePoint } from "@/lib/market/book-rows";

export type QuoteAsk = { ticker: string; exchange: string };

export function useQuotes(asks: readonly QuoteAsk[]): {
  quotes: Record<string, QuotePoint | null>;
  status: "idle" | "loading" | "ready";
} {
  const key = asks
    .filter((a) => a.ticker)
    .map((a) => `${a.ticker.toUpperCase()}:${a.exchange}`)
    .sort()
    .join(",");
  const [quotes, setQuotes] = useState<Record<string, QuotePoint | null>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  useEffect(() => {
    if (!key) {
      setQuotes({});
      setStatus("ready");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void fetch(`/api/quotes?items=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((body: { quotes?: Record<string, QuotePoint | null> }) => {
        if (cancelled) return;
        setQuotes(body.quotes ?? {});
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setQuotes({});
        setStatus("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { quotes, status };
}
