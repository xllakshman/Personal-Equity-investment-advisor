"use client";

import { useEffect, useRef, useState } from "react";

import type { TickerHit } from "@/lib/market/ticker-search";

export function TickerLookup({
  value,
  onChange,
  onPick,
  name,
  placeholder = "MSFT, TSM, HDFCBANK…",
  ariaLabel = "Ticker",
  inputClassName = "pf__input",
}: {
  value: string;
  onChange: (ticker: string) => void;
  onPick?: (ticker: string) => void;
  name?: string;
  placeholder?: string;
  ariaLabel?: string;
  inputClassName?: string;
}) {
  const [hits, setHits] = useState<TickerHit[]>([]);
  const [open, setOpen] = useState(false);
  const skipOpen = useRef(false);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setHits([]);
      setOpen(false);
      return;
    }
    if (skipOpen.current) {
      skipOpen.current = false;
      return;
    }
    const ac = new AbortController();
    const t = window.setTimeout(() => {
      void fetch(`/api/ticker-search?q=${encodeURIComponent(q)}`, { signal: ac.signal })
        .then((r) => r.json())
        .then((body: { hits?: TickerHit[] }) => {
          setHits(body.hits ?? []);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setHits([]);
        });
    }, 280);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [value]);

  return (
    <div className="bld__lookup">
      <input
        className={inputClassName}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onFocus={() => hits.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoCapitalize="characters"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-autocomplete="list"
      />
      {open && hits.length > 0 ? (
        <ul className="bld__lookup-list" role="listbox">
          {hits.map((h) => (
            <li key={h.symbol}>
              <button
                type="button"
                className="bld__lookup-hit"
                onClick={() => {
                  skipOpen.current = true;
                  onChange(h.ticker);
                  setOpen(false);
                  onPick?.(h.ticker);
                }}
              >
                <strong>{h.ticker}</strong>
                <span>{h.name}</span>
                <em>{h.exchange}</em>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
