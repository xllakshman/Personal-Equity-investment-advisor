"use server";

import {
  CONTACT_SUCCESS,
  parseContactFields,
  type ContactActionState,
} from "@/lib/contact/parse";
import { sendContactEmail } from "@/lib/contact/send";

export async function submitContact(
  _prev: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const parsed = parseContactFields({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phoneCc: String(formData.get("phoneCc") ?? ""),
    phoneNational: String(formData.get("phoneNational") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error, notice: null };

  const sent = await sendContactEmail(parsed.value);
  if (!sent.ok) return { error: sent.error, notice: null };
  return { error: null, notice: CONTACT_SUCCESS };
}
