export const TAX_RESIDENCIES = ["us", "india", "uae", "nri"] as const;
export type TaxResidency = (typeof TAX_RESIDENCIES)[number];

export const TAX_RESIDENCY_OPTIONS: { value: TaxResidency; label: string }[] = [
  { value: "us", label: "United States" },
  { value: "india", label: "India" },
  { value: "uae", label: "United Arab Emirates" },
  { value: "nri", label: "Non-resident Indian (NRI)" },
];

export const PHONE_COUNTRY_CODES = ["+1", "+91", "+971"] as const;
export type PhoneCountryCode = (typeof PHONE_COUNTRY_CODES)[number];

export const PHONE_COUNTRY_OPTIONS: { value: PhoneCountryCode; label: string }[] =
  [
    { value: "+1", label: "🇺🇸 +1 · USA" },
    { value: "+91", label: "🇮🇳 +91 · India" },
    { value: "+971", label: "🇦🇪 +971 · UAE" },
  ];

export type SignupFields = {
  fullName: string;
  taxResidency: TaxResidency;
  email: string;
  phoneCc: PhoneCountryCode;
  phoneNational: string;
  phoneE164: string;
  password: string;
};

export type SignupParseError = { ok: false; error: string };
export type SignupParseOk = { ok: true; value: SignupFields };

function isTaxResidency(value: string): value is TaxResidency {
  return (TAX_RESIDENCIES as readonly string[]).includes(value);
}

function isPhoneCc(value: string): value is PhoneCountryCode {
  return (PHONE_COUNTRY_CODES as readonly string[]).includes(value);
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function toE164(
  cc: string,
  national: string,
): { ok: true; e164: string } | { ok: false; error: string } {
  if (!isPhoneCc(cc)) {
    return { ok: false, error: "Country code must be +91, +1, or +971." };
  }
  const digits = digitsOnly(national);
  if (!digits) {
    return { ok: false, error: "Enter a mobile number." };
  }
  if (digits.length < 6 || digits.length > 15) {
    return { ok: false, error: "Enter a valid mobile number." };
  }
  return { ok: true, e164: `${cc}${digits}` };
}

export function parseSignupFields(
  input: Record<string, string | undefined>,
): SignupParseOk | SignupParseError {
  const fullName = (input.fullName ?? "").trim();
  if (!fullName) return { ok: false, error: "Enter your full name." };

  const taxResidency = (input.taxResidency ?? "").trim();
  if (!taxResidency) return { ok: false, error: "Choose a tax residency." };
  if (!isTaxResidency(taxResidency)) {
    return { ok: false, error: "Tax residency must be US, India, UAE, or NRI." };
  }

  const email = (input.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Enter an email." };
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email." };

  const phoneCc = (input.phoneCc ?? "").trim();
  const e164 = toE164(phoneCc, input.phoneNational ?? "");
  if (!e164.ok) return e164;

  const password = input.password ?? "";
  if (!password) return { ok: false, error: "Enter a password." };
  if (password.length < 12) {
    return { ok: false, error: "Password must be at least 12 characters." };
  }

  return {
    ok: true,
    value: {
      fullName,
      taxResidency,
      email,
      phoneCc: phoneCc as PhoneCountryCode,
      phoneNational: digitsOnly(input.phoneNational ?? ""),
      phoneE164: e164.e164,
      password,
    },
  };
}

export function loginEmailError(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Enter an email.";
  if (!trimmed.includes("@")) return "Enter a valid email.";
  return null;
}
