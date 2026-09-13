import { type NextRequest, NextResponse } from "next/server";

import { isDeskPath } from "@/lib/desk/nav";
import { updateSession } from "@/lib/supabase/middleware";

/** Recovery lands on /reset with a session — do not bounce that to /desk. */
const AUTH_ENTRY = new Set(["/login", "/signup"]);

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname === "/admin/") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (!user && isDeskPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ENTRY.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/desk";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
