export type AdminAccountRow = {
  id: string;
  familyId: string;
  email: string;
  name: string;
  residency: string;
  plan: string;
  planId: string | null;
  billingStatus: string;
  pendingTitle: string | null;
  pendingPlanId: string | null;
  used: number;
  limit: number | null;
  mtd: number;
};

export function isWaitingForActivate(row: {
  billingStatus: string;
  pendingPlanId: string | null;
}): boolean {
  if (row.pendingPlanId) return true;
  return row.billingStatus === "trial" || row.billingStatus === "—";
}

export function splitAdminAccounts<T extends {
  billingStatus: string;
  pendingPlanId: string | null;
}>(rows: T[]): { waiting: T[]; existing: T[] } {
  const waiting: T[] = [];
  const existing: T[] = [];
  for (const row of rows) {
    if (isWaitingForActivate(row)) waiting.push(row);
    else existing.push(row);
  }
  return { waiting, existing };
}
