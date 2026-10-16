import { getSessionCookie } from "better-auth/cookies";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { getAuth } from "@/lib/auth";
import { RETURN_PARAM, RETURN_PATH_HEADER, safeReturnPath } from "@/lib/return-to";

const intl = createMiddleware(routing);

// Pages for visitors only: sign-in, forgot password, membership sign-up.
// (The new-password page stays reachable: it is opened from an email.)
const GUEST_ONLY = new RegExp(
  `^/(${routing.locales.join("|")})/(connexion(/mot-de-passe-oublie)?|adhesion)/?$`,
);

export default async function proxy(request: NextRequest) {
  const match = GUEST_ONLY.exec(request.nextUrl.pathname);
  // Cookie check first: guests never hit the database here.
  if (match && getSessionCookie(request)) {
    const session = await getAuth()
      .api.getSession({ headers: request.headers })
      .catch(() => null);
    if (session) {
      // Already signed in: straight to the page the sign-in was for.
      const next = safeReturnPath(request.nextUrl.searchParams.get(RETURN_PARAM)) ?? "";
      return NextResponse.redirect(new URL(`/${match[1]}${next === "/" ? "" : next}`, request.url));
    }
  }
  // The page asked for, for the login walls of the pages (lib/auth-redirect.ts). next-intl
  // passes the request headers on to the app.
  const headers = new Headers(request.headers);
  const asked = safeReturnPath(`${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (asked) headers.set(RETURN_PATH_HEADER, asked);
  else headers.delete(RETURN_PATH_HEADER);
  return intl(new NextRequest(request, { headers }));
}

export const config = {
  // Everything except API routes, Next internals and the real static files of public/ and app/.
  // Other paths (even "/xyz.txt") get a locale prefix, then the localized 404.
  matcher: "/((?!api|_next|_vercel|brand/|\\.well-known/|robots\\.txt|sitemap\\.xml|icon\\.svg|favicon\\.ico).*)",
};
