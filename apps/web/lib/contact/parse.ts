import {
  PHONE_COUNTRY_CODES,
  digitsOnly,
  toE164,
  type PhoneCountryCode,
} from "@/lib/auth/signup-fields";

export const CONTACT_INBOX = "lakshmaneluri@gmail.com";

export const CONTACT_SUCCESS =
  "Thank you for submitting a request. We’ll get back to you within 24–48 hours.";

export type ContactFields = {
  fullName: string;
  email: string;
  phoneCc: PhoneCountryCode;
  phoneNational: string;
  phoneE164: string;
  message: string;
};

export type ContactParse =
  | { ok: true; value: ContactFields }
  | { ok: false; error: string };

export type ContactActionState = { error: string | null; notice: string | null };

export const EMPTY_CONTACT_STATE: ContactActionState = {
  error: null,
  notice: null,
};

export function parseContactFields(
  input: Record<string, string | undefined>,
): ContactParse {
  const fullName = (input.fullName ?? "").trim();
  if (!fullName) return { ok: false, error: "Enter your name." };
  if (fullName.length > 120) return { ok: false, error: "Name is too long." };

  const email = (input.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Enter your email." };
  if (!email.includes("@") || email.length > 200) {
    return { ok: false, error: "Enter a valid email." };
  }

  const phoneCc = (input.phoneCc ?? "").trim();
  if (!(PHONE_COUNTRY_CODES as readonly string[]).includes(phoneCc)) {
    return { ok: false, error: "Country code must be +91, +1, or +971." };
  }
  const e164 = toE164(phoneCc, input.phoneNational ?? "");
  if (!e164.ok) return e164;

  const message = (input.message ?? "").trim();
  if (!message) return { ok: false, error: "Write a short message." };
  if (message.length > 4000) return { ok: false, error: "Message is too long." };

  return {
    ok: true,
    value: {
      fullName,
      email,
      phoneCc: phoneCc as PhoneCountryCode,
      phoneNational: digitsOnly(input.phoneNational ?? ""),
      phoneE164: e164.e164,
      message,
    },
  };
}
