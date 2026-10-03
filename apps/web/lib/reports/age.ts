/** Age helpers for Reports. lastRun is ISO from reports.created_at. */

export const STALE_AFTER_DAYS = 30;

export const STALE_COPY =
  "This note is more than 30 days old. Markets and the company may have moved — treat it as possibly obsolete.";

export type ReportPeriod = "all" | "week" | "month";

export function daysOld(iso: string, now = new Date()): number {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

export function isStaleNote(iso: string, now = new Date()): boolean {
  return daysOld(iso, now) > STALE_AFTER_DAYS;
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
    const start = new Date(now);
    start.setUTCDate(now.getUTCDate() - 7);
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
