/** Server-only analysis-api base. Browser must not get the service role. */

export function analysisApiBase(): string {
  return (
    process.env.ANALYSIS_API_URL?.trim() ||
    process.env.THESIS_ANALYSIS_API?.trim() ||
    "http://127.0.0.1:8091"
  );
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
