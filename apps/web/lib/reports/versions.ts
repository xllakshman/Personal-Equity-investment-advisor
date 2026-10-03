/** Version numbers for saved research. Oldest note for a ticker is v1. */

export function assignNoteVersions<
  T extends { ticker: string; kind: string; lastRun: string },
>(rows: T[]): Array<T & { version: number | null; versionCount: number }> {
  const notes = rows.filter((r) => r.kind === "note");
  const byTicker = new Map<string, T[]>();
  for (const row of notes) {
    const key = row.ticker.toUpperCase();
    const list = byTicker.get(key) ?? [];
    list.push(row);
    byTicker.set(key, list);
  }
  const versionOf = new Map<T, { version: number; versionCount: number }>();
  for (const list of byTicker.values()) {
    const ordered = [...list].sort((a, b) =>
      a.lastRun < b.lastRun ? -1 : a.lastRun > b.lastRun ? 1 : 0,
    );
    ordered.forEach((row, i) => {
      versionOf.set(row, { version: i + 1, versionCount: ordered.length });
    });
  }
  return rows.map((row) => {
    const hit = versionOf.get(row);
    return {
      ...row,
      version: hit?.version ?? null,
      versionCount: hit?.versionCount ?? 0,
    };
  });
}

export function versionLabel(version: number | null, count: number): string {
  if (version == null || count < 1) return "—";
  if (count === 1) return "v1";
  return `v${version} of ${count}`;
}
