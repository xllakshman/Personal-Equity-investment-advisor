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

Port **3100** (not 3000). Anon `/` is the marketing home. Logged-in `/` redirects to `/desk`.

## Layout

```
apps/web/
├── app/(marketing)/        # `/`
├── app/(auth)/             # `/login` `/signup` `/reset`
├── app/(desk)/             # `/desk` `/analyse` `/portfolio` `/reports` `/usage` `/billing`
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
