/** Support grant length shown on Portfolio. Writes `support_access_grants.expires_at`. */
export const SUPPORT_DAYS_MIN = 3;
export const SUPPORT_DAYS_MAX = 15;
export const SUPPORT_DAYS_DEFAULT = 3;

export function parseSupportDays(raw: FormDataEntryValue | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return SUPPORT_DAYS_DEFAULT;
  return Math.min(SUPPORT_DAYS_MAX, Math.max(SUPPORT_DAYS_MIN, Math.round(n)));
}
