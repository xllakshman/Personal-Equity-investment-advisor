/** Locked copy when Google OAuth is off in this project (P0-03 / D24). */
export const GOOGLE_NOT_ENABLED = "Google sign-in is not enabled";

export function googleSignInBanner(message: string | null | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return GOOGLE_NOT_ENABLED;
  const lower = raw.toLowerCase();
  if (
    lower.includes("not enabled") ||
    lower.includes("unsupported provider") ||
    lower.includes("provider is not enabled") ||
    lower.includes("validation_failed") ||
    lower.includes("unsupported_provider") ||
    lower.includes("missing next_public_supabase") ||
    lower.includes("next_public_supabase_url") ||
    lower.includes("next_public_supabase_anon_key")
  ) {
    return GOOGLE_NOT_ENABLED;
  }
  return raw;
}
