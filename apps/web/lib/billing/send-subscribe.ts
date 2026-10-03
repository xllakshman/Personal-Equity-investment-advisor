import { CONTACT_INBOX } from "@/lib/contact/parse";

export type SubscribeMailFields = {
  fullName: string;
  email: string;
  familyId: string;
  planTitle: string;
  planSlug: string;
  priceCents: number;
  vpa: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendSubscribeRequestEmail(
  fields: SubscribeMailFields,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = (env.RESEND_API_KEY ?? "").trim();
  if (!key) {
    return { ok: false, error: "Mail is not connected yet." };
  }
  const from =
    (env.RESEND_FROM ?? "").trim() || "eqveste <onboarding@resend.dev>";
  const dollars = `$${(fields.priceCents / 100).toFixed(0)}`;
  const text = [
    `${fields.fullName} (${fields.email}) requested ${fields.planTitle} (${fields.planSlug}) at ${dollars}/month.`,
    `Family: ${fields.familyId}`,
    `Pay to UPI ${fields.vpa}. Activate or deactivate on /admin/accounts. families.plan_id is unchanged until you Activate.`,
  ].join("\n");
  const html = [
    `<p><strong>${escapeHtml(fields.fullName)}</strong> (${escapeHtml(fields.email)}) requested <strong>${escapeHtml(fields.planTitle)}</strong> (${escapeHtml(fields.planSlug)}) at ${escapeHtml(dollars)}/month.</p>`,
    `<p>Family: <code>${escapeHtml(fields.familyId)}</code></p>`,
    `<p>Pay to UPI <code>${escapeHtml(fields.vpa)}</code>. Activate or deactivate on /admin/accounts. families.plan_id is unchanged until you Activate.</p>`,
  ].join("");

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
        subject: `eqveste subscribe: ${fields.planTitle} — ${fields.email}`,
        text,
        html,
      }),
    });
  } catch {
    return { ok: false, error: "Could not send that just now." };
  }
  if (!res.ok) {
    return { ok: false, error: "Could not send that just now." };
  }
  return { ok: true };
}
