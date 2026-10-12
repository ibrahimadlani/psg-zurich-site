import { getSessionCookie } from "better-auth/cookies";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { getAuth } from "@/lib/auth";

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
    if (session) return NextResponse.redirect(new URL(`/${match[1]}`, request.url));
  }
  return intl(request);
}

export const config = {
  // Everything except API routes, Next internals and the real static files of public/ and app/.
  // Other paths (even "/xyz.txt") get a locale prefix, then the localized 404.
  matcher: "/((?!api|_next|_vercel|brand/|robots\\.txt|icon\\.svg|favicon\\.ico).*)",
};
