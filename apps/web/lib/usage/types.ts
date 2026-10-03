export type UsageSnapshot = {
  used: number;
  limit: number | null;
  planName: string | null;
  planSlug: string | null;
  billingStatus: string;
  walletCents: number;
  costCents: number;
  notices: { pct: number; message: string }[];
  exhausted: boolean;
};
