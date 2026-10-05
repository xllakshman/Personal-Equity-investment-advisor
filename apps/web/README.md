# Web (`apps/web`)

Next.js App Router. Marketing `/` + desk `/login` → `/desk` on **http://127.0.0.1:3100/**.

Do not import `docs/mock-ui/support.js`. Browser env is URL + anon only — never `NEXT_PUBLIC_*` service-role.

## Run

```bash
cd apps/web
npm run dev                  # http://127.0.0.1:3100
npm run build
npm test
```

Port **3100** (not 3000). Anon `/` is the marketing home. Logged-in `/` redirects to `/desk`. `/desk` and `/portfolio` display money in `portfolios.display_currency` (default USD; saved INR stays INR; FX display only — never writes converted amounts into `holding_lots`). `/desk` KPIs: **Equity portfolio value** from view `holdings`, **Cash** from `investor_profiles.outside_book.cash` (edit on `/settings/profile`), **Total Portfolio** = equity + cash in USD (unset cash → —). `/desk` may fetch Yahoo chart v8 on the server for the NASDAQ/S&P trend and unrealized P&L % (display only; does not write lots). `/portfolio` writes `holding_lots`. `/admin/*` console text is ink on the same paper as desk chrome (`admin.css`; does not restyle `/desk`). `/reports/[id]` reads `reports` for the session `family_id`; new notes may show Filer / Coverage in Key data, a collapsible integrity panel, and ChartBlock figures from `reports.charts` (source/as_of + View data; pie/html dropped). P11-19 does not change that screen (worker-only repair).

## Layout

```
apps/web/
├── app/(marketing)/        # `/`
├── app/(auth)/             # `/login` `/signup` `/reset`
├── app/(desk)/             # `/desk` `/analyse` `/analyse/[id]` `/portfolio` `/reports` `/usage` `/billing`
├── components/features/builder/
├── app/admin/login/        # stub — P7-00 builds the form
├── components/features/marketing/
├── components/features/auth/
├── components/features/desk/
├── lib/supabase/
├── lib/auth/
├── lib/desk/
├── proxy.ts                # session refresh + desk gate
└── README.md
```

Platform admin is **`/admin/login`**, not a desk nav item.
