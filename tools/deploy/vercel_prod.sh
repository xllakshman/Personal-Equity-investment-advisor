#!/usr/bin/env bash
# P10-01: set Vercel Production env from .env.prod (anon URL+key only) and deploy apps/web.
# Never sets SUPABASE_SERVICE_KEY, SUPABASE_DB_PASSWORD, or lab LLM keys.
# Usage after you name prod: ./tools/deploy/vercel_prod.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEB="${ROOT}/apps/web"
ENV_FILE="${ROOT}/.env.prod"
PROJECT="prj_mX7Fv5k7h6Rb3YC35FQvpzEJHch4"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing .env.prod" >&2
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "Install Vercel CLI: npm i -g vercel" >&2
  exit 1
fi

URL=""
ANON=""
RESEND=""
while IFS= read -r line; do
  case "${line}" in
    NEXT_PUBLIC_SUPABASE_URL=*) URL="${line#NEXT_PUBLIC_SUPABASE_URL=}" ;;
    NEXT_PUBLIC_SUPABASE_ANON_KEY=*) ANON="${line#NEXT_PUBLIC_SUPABASE_ANON_KEY=}" ;;
    SUPABASE_ANON_KEY=*)
      if [[ -z "${ANON}" ]]; then ANON="${line#SUPABASE_ANON_KEY=}"; fi
      ;;
    RESEND_API_KEY=*) RESEND="${line#RESEND_API_KEY=}" ;;
  esac
done < "${ENV_FILE}"
URL="${URL%%$'\r'}"
ANON="${ANON%%$'\r'}"

if [[ "${URL}" != "https://ndgvglcrkbygovlszxze.supabase.co" ]]; then
  echo "REFUSING: NEXT_PUBLIC_SUPABASE_URL is not prod" >&2
  exit 3
fi
if [[ -z "${ANON}" ]]; then
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) is empty in .env.prod" >&2
  exit 1
fi

cd "${WEB}"
echo "Linking apps/web to Vercel project ${PROJECT} (Production)."
vercel link --yes --project "${PROJECT}" >/dev/null

echo "Removing any Production SERVICE/DB/LLM names if present (must stay off Vercel)."
for name in SUPABASE_SERVICE_KEY SUPABASE_DB_PASSWORD OPENROUTER_API_KEY OPENAI_API_KEY ANTHROPIC_API_KEY XAI_API_KEY DEEPSEEK_API_KEY; do
  vercel env rm "${name}" production --yes >/dev/null 2>&1 || true
done

echo "Setting Production NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
printf '%s' "${URL}" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --force >/dev/null
printf '%s' "${ANON}" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force >/dev/null

if [[ -n "${RESEND}" ]]; then
  echo "Setting Production RESEND_API_KEY (server, not NEXT_PUBLIC)."
  printf '%s' "${RESEND%%$'\r'}" | vercel env add RESEND_API_KEY production --force >/dev/null
fi

echo "Deploying Production (root apps/web)."
vercel deploy --prod --yes --local-config "${WEB}/vercel.json" 2>/dev/null || vercel deploy --prod --yes

echo "Env names on Production (values not printed):"
vercel env ls production
