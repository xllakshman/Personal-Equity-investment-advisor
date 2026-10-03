const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SubscribeRequest = {
  planId: string;
};

export function parseSubscribePlanId(raw: string):
  | { ok: true; value: SubscribeRequest }
  | { ok: false; error: string } {
  const planId = raw.trim();
  if (!planId) return { ok: false, error: "Pick a plan." };
  if (!UUID.test(planId)) return { ok: false, error: "Pick a plan." };
  return { ok: true, value: { planId } };
}

export function subscribeNotice(args: {
  planTitle: string;
  priceCents: number;
  vpa: string;
  mailed: boolean;
}): string {
  const dollars = `$${(args.priceCents / 100).toFixed(0)}`;
  const pay =
    args.priceCents > 0
      ? ` Pay ${dollars} to ${args.vpa} with UPI. Your current plan stays until we turn this one on.`
      : " Your current plan stays until we turn this one on.";
  if (args.mailed) {
    return `Request for ${args.planTitle} is saved.${pay}`;
  }
  return `Request for ${args.planTitle} is saved. We could not email the operator; it still shows on Admin → Accounts.${pay}`;
}
