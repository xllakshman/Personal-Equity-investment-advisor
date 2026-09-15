import { submitTickerSearch } from "@/app/(desk)/actions";

export function TickerSearch() {
  return (
    <form className="desk__search" action={submitTickerSearch}>
      <input
        name="ticker"
        aria-label="Search a ticker to analyse"
        placeholder="Search a ticker to analyse — MSFT, TSM, HDFCBANK…"
        autoCapitalize="characters"
        autoComplete="off"
      />
    </form>
  );
}
