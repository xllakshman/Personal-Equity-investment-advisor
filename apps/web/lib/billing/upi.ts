export const UPI_VPA = "9500005759@idfcfirst";

export const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", available: true, hint: "GPay or any UPI app" },
  { id: "credit", label: "Credit card", available: false, hint: "Coming soon" },
  { id: "debit", label: "Debit card", available: false, hint: "Coming soon" },
] as const;
