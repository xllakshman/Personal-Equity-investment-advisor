/** Server-only analysis-api base. Browser must not get the service role. */

export const PROD_ANALYSIS_API_URL = "https://api.eqveste.com";

export function analysisApiBase(env: NodeJS.ProcessEnv = process.env): string {
  const explicit =
    env.ANALYSIS_API_URL?.trim() || env.THESIS_ANALYSIS_API?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (env.VERCEL) return PROD_ANALYSIS_API_URL;
  return "http://127.0.0.1:8091";
}

export async function analysisApiFetch(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${analysisApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}
