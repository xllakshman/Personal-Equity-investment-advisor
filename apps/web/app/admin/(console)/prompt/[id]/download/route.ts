import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requirePlatformAdmin();
  const { id } = await context.params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prompt_versions")
    .select("semver, body")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.body) {
    return NextResponse.json(
      { error: error?.message ?? "Prompt version not found." },
      { status: 404 },
    );
  }
  const safeName = String(data.semver)
    .replace(/[^\w.\- :]+/g, "_")
    .slice(0, 120);
  return new NextResponse(String(data.body), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.txt"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
