import { CONTACT_INBOX, type ContactFields } from "./parse";

export async function sendContactEmail(
  fields: ContactFields,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = (env.RESEND_API_KEY ?? "").trim();
  if (!key) {
    return {
      ok: false,
      error: "Mail is not connected yet. Email us directly and we will reply.",
    };
  }

  const from =
    (env.RESEND_FROM ?? "").trim() || "eqveste <onboarding@resend.dev>";
  const text = [
    `Name: ${fields.fullName}`,
    `Email: ${fields.email}`,
    `Phone: ${fields.phoneE164}`,
    "",
    fields.message,
  ].join("\n");

  let res: Response;
  try {
    res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [CONTACT_INBOX],
        reply_to: fields.email,
        subject: `eqveste contact: ${fields.fullName}`,
        text,
      }),
    });
  } catch {
    return {
      ok: false,
      error: "Could not send that just now. Try again in a few minutes.",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: "Could not send that just now. Try again in a few minutes.",
    };
  }
  return { ok: true };
}
