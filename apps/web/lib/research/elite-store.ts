import type { SupabaseClient } from "@supabase/supabase-js";

import { emptySnapshot, mergeBook, type EliteInvestorBook, type EliteSnapshot } from "./elite-types";

function asBook(raw: unknown): EliteInvestorBook | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as EliteInvestorBook;
  if (!row.slug || typeof row.slug !== "string") return null;
  return row;
}

export async function loadPersistedSnapshot(
  supabase: SupabaseClient,
): Promise<EliteSnapshot> {
  const snap = emptySnapshot();
  const { data } = await supabase.from("elite_investor_books").select("slug, payload, refreshed_at");
  if (!data?.length) return snap;
  let generatedAt: string | null = null;
  let next = snap;
  for (const row of data) {
    const book = asBook(row.payload);
    if (!book) continue;
    next = mergeBook(next, {
      ...book,
      slug: String(row.slug),
      refreshedAt: book.refreshedAt ?? (row.refreshed_at ? String(row.refreshed_at) : null),
    });
    const at = next.investors.find((i) => i.slug === row.slug)?.refreshedAt;
    if (at && (!generatedAt || at > generatedAt)) generatedAt = at;
  }
  return { ...next, generatedAt };
}

export async function persistEliteBook(
  supabase: SupabaseClient,
  book: EliteInvestorBook,
): Promise<EliteSnapshot> {
  const refreshedAt = book.refreshedAt ?? new Date().toISOString();
  await supabase.from("elite_investor_books").upsert(
    {
      slug: book.slug,
      payload: { ...book, refreshedAt },
      refreshed_at: refreshedAt,
    },
    { onConflict: "slug" },
  );
  const snap = await loadPersistedSnapshot(supabase);
  return mergeBook(snap, { ...book, refreshedAt });
}
