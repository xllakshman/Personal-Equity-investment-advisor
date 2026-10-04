/** Age helpers for Reports. lastRun is ISO from reports.created_at. */

export const STALE_AFTER_DAYS = 60;

export const STALE_COPY =
  "Prices and news move on. Any note older than 60 days is marked outdated — run a fresh analysis before you act on it.";

export type ReportPeriod = "all" | "week" | "month";
export type ReportGroupBy = "week" | "month";

export type ReportFilterOption = {
  value: string;
  label: string;
};

export function daysOld(iso: string, now = new Date()): number {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

export function isStaleNote(iso: string, now = new Date()): boolean {
  return daysOld(iso, now) > STALE_AFTER_DAYS;
}

export function relativeAge(iso: string, now = new Date()): string {
  const d = daysOld(iso, now);
  if (d <= 0) return "today";
  if (d === 1) return "1 day ago";
  if (d < 14) return `${d} days ago`;
  const w = Math.floor(d / 7);
  return w === 1 ? "1 week ago" : `${w} weeks ago`;
}

export function noteDateLabel(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";
  return then
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function weekStartUtc(iso: string): Date {
  const then = new Date(iso);
  const day = then.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(
    Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate() + mondayOffset),
  );
}

export function weekKey(iso: string): string {
  return weekStartUtc(iso).toISOString().slice(0, 10);
}

export function weekLabel(iso: string, _now = new Date()): string {
  const start = weekStartUtc(iso);
  return `Week of ${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })}`;
}

export function distinctCompanyOptions(
  rows: { ticker: string; name: string }[],
): ReportFilterOption[] {
  const seen = new Set<string>();
  const out: ReportFilterOption[] = [];
  for (const row of rows) {
    const ticker = String(row.ticker ?? "")
      .trim()
      .toUpperCase();
    const name = String(row.name ?? "").trim();
    const value = ticker || name;
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const label = ticker && name && !name.toUpperCase().startsWith(ticker)
      ? `${ticker} · ${name}`
      : ticker || name;
    out.push({ value, label });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export function distinctMonthOptions(isos: string[]): ReportFilterOption[] {
  const keys = [
    ...new Set(
      isos
        .map((iso) => monthKey(iso))
        .filter((key) => /^\d{4}-\d{2}$/.test(key)),
    ),
  ].sort().reverse();
  return keys.map((value) => ({ value, label: monthLabel(value) }));
}

export function distinctWeekOptions(
  isos: string[],
  now = new Date(),
): ReportFilterOption[] {
  const seen = new Set<string>();
  const out: ReportFilterOption[] = [];
  const sorted = [...isos].sort((a, b) => weekKey(b).localeCompare(weekKey(a)));
  for (const iso of sorted) {
    const value = weekKey(iso);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, label: weekLabel(`${value}T00:00:00.000Z`, now) });
  }
  const counts = new Map<string, number>();
  for (const row of out) {
    counts.set(row.label, (counts.get(row.label) ?? 0) + 1);
  }
  return out.map((row) =>
    (counts.get(row.label) ?? 0) > 1
      ? { value: row.value, label: `${row.label} · ${row.value}` }
      : row,
  );
}

export function inReportPeriod(
  iso: string,
  period: ReportPeriod,
  now = new Date(),
): boolean {
  if (period === "all") return true;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return false;
  if (period === "week") {
    const start = weekStartUtc(now.toISOString());
    return then >= start;
  }
  return (
    then.getUTCFullYear() === now.getUTCFullYear() &&
    then.getUTCMonth() === now.getUTCMonth()
  );
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function matchesCompany(
  row: { ticker: string; name: string },
  company: string,
): boolean {
  const q = company.trim().toUpperCase();
  if (!q) return true;
  return (
    row.ticker.toUpperCase() === q ||
    row.name.toUpperCase().includes(q)
  );
}

export function verdictTone(text: string): "add" | "hold" | "sell" {
  const t = text.toLowerCase();
  if (/\b(sell|trim|exit|reduce)\b/.test(t)) return "sell";
  if (/\b(hold|wait)\b/.test(t)) return "hold";
  return "add";
}
