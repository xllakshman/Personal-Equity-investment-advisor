# Session 2026-09-13 — P1-01 Marketing home

**Chunk:** P1-01 ✅  
**Route:** `/` on **http://127.0.0.1:3100/** — dark-glass marketing page rebuilt from `docs/mock-ui/Home.dc.html` (not wrapped HTML; `support.js` is not imported).

## What exists

- `apps/web/app/(marketing)/page.tsx` — `getOptionalUser()` then **`redirect("/desk")`** if a desk JWT exists.
- `components/features/marketing/HomePage.tsx`, `PlanGrid.tsx`, `WaitlistForm.tsx` + `app/(marketing)/marketing.css`.
- Header **Log in** → `/login`, **Create account** → `/signup`. Those routes are **not** built (P1-02); they 404 today.
- `/desk` is **not** built (P1-03). A logged-in `/` visit 307s to `/desk`, then 404 until P1-03.
- Waitlist **Subscribe** is a client no-op: success copy only. No waitlist table. Copy on the form: “Nothing is stored yet — no waitlist table in this chunk.”
- Plan cards use **Professional +** (not Premium). Yearly toggle switches Basic to `$32` / year.
- `npm run dev` / `npm start` bind **`127.0.0.1:3100`** (`apps/web/package.json`). Not 3000.

## What does not exist yet

- `/login`, `/signup`, `/reset` (**P1-02**).
- Desk shell `/desk` (**P1-03**).
- No row written on waitlist submit.

## Next

[`docs/roadmap/ROADMAP.md`](../roadmap/ROADMAP.md) **P1-02**.
