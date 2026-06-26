import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

/**
 * Next.js 16 renamed Middleware → Proxy (same mechanics).
 *
 * Cheap optimistic gate: redirect to the login page if there's no moderator
 * cookie at all. The real cryptographic check happens server-side via
 * getModerator(); this just avoids rendering the console shell for anon users.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/moderation") && !pathname.startsWith("/moderation/login")) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/moderation/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/moderation/:path*"],
};
