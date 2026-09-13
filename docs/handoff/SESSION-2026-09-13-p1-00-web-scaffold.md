# Session 2026-09-13 — P1-00 Next.js scaffold

**Chunk:** P1-00 ✅  
**Route:** `/` on `http://127.0.0.1:3000` — title **Thesis**, not the Next.js welcome page.

## What exists

- `apps/web` App Router (Next 16, React 19, Tailwind 4).
- `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (cookies). Both use `publicSupabaseEnv()` — URL + anon only. Throws if any `NEXT_PUBLIC_*SERVICE*` is set.
- `apps/web/.env.example` and gitignored `.env.local` (anon only).
- `npm run build` passed. `npm test` covers `publicEnv`.

## What does not exist yet

- Marketing home from `Home.dc.html` (**P1-01**).
- `/login` (**P1-02**).
- Desk shell. Do not import `docs/mock-ui/support.js`.

## Next

[`docs/roadmap/ROADMAP.md`](../roadmap/ROADMAP.md) **P1-01**.
