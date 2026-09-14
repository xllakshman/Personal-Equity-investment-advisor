import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const PRODUCTS = new Set([
  "auth",
  "desk",
  "analyse",
  "portfolio",
  "reports",
  "refine",
  "billing",
  "worker",
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = (await request.json().catch(() => ({}))) as {
    product_id?: string;
    route?: string;
  };
  const product = PRODUCTS.has(String(body.product_id)) ? String(body.product_id) : "desk";
  const route = String(body.route ?? "").slice(0, 200);
  const { error } = await supabase.rpc("observability_record_event", {
    p_product_id: product,
    p_route: route,
    p_status_code: 200,
    p_duration_ms: 0,
    p_error_code: null,
  });
  if (error) {
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({ ok: true });
}
