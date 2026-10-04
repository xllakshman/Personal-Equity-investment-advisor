"use client";

import { useState } from "react";

import { TickerLookup } from "@/components/features/builder/TickerLookup";
import { tickerSearchHref, tickerSearchTarget } from "@/lib/desk/ticker";

export function TickerSearch() {
  const [value, setValue] = useState("");

  function go(raw: string) {
    window.location.assign(tickerSearchHref(tickerSearchTarget(raw)));
  }

  return (
    <form
      className="desk__search"
      action="/analyse"
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
    >
      <TickerLookup
        value={value}
        onChange={setValue}
        onPick={go}
        name="ticker"
        placeholder="Search a stock you own — MSFT, TSM, HDFCBANK…"
        ariaLabel="Search a ticker to analyse"
      />
      <button className="desk__search-btn" type="submit">
        Analyse
      </button>
    </form>
  );
}
