import { getSessionCookie } from "better-auth/cookies";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { getAuth } from "@/lib/auth";
import { getHomeSettings } from "@/lib/site-settings";
import { englishPath } from "@/lib/legacy-paths";
import { RETURN_PARAM, RETURN_PATH_HEADER, safeReturnPath } from "@/lib/return-to";
import { publicUrl } from "@/lib/public-origin";

const intl = createMiddleware(routing);

// The home page, "/fr" (or "/fr/"): the waiting page replaces it for visitors while the site is closed.
const HOME = new RegExp(`^/(${routing.locales.join("|")})/?$`);
// The committee's choice, read at most every 15 s (each visit to the home page would query it).
let homeVisitorCache: { value: string; at: number } | null = null;
async function homeForVisitors() {
  if (homeVisitorCache && Date.now() - homeVisitorCache.at < 15_000) return homeVisitorCache.value;
  const value = await getHomeSettings()
    .then((settings) => settings.visitor)
    .catch(() => "landing");
  homeVisitorCache = { value, at: Date.now() };
  return value;
}

// Pages for visitors only: sign-in, forgot password, membership sign-up.
// (The new-password page stays reachable: it is opened from an email.)
const GUEST_ONLY = new RegExp(
  `^/(${routing.locales.join("|")})/(login(/forgot-password)?|join)/?$`,
);

export default async function proxy(request: NextRequest) {
  // Old French addresses: once, for good, to the English page.
  const english = englishPath(request.nextUrl.pathname);
  if (english) {
    return NextResponse.redirect(publicUrl(`${english}${request.nextUrl.search}`, request), 308);
  }
  // Visitors (no session cookie) on the home page while it is closed: the waiting page, at the
  // same address. Signed-in members and the committee's previews (?variante=) get the real home.
  const home = HOME.exec(request.nextUrl.pathname);
  if (home && !getSessionCookie(request) && !request.nextUrl.searchParams.has("variante") && (await homeForVisitors()) === "coming_soon") {
    const url = request.nextUrl.clone();
    url.pathname = `/${home[1]}/coming-soon`;
    return NextResponse.rewrite(url);
  }
  const match = GUEST_ONLY.exec(request.nextUrl.pathname);
  // Cookie check first: guests never hit the database here.
  if (match && getSessionCookie(request)) {
    const session = await getAuth()
      .api.getSession({ headers: request.headers })
      .catch(() => null);
    if (session) {
      // Already signed in: straight to the page the sign-in was for.
      const next = safeReturnPath(request.nextUrl.searchParams.get(RETURN_PARAM)) ?? "";
      return NextResponse.redirect(publicUrl(`/${match[1]}${next === "/" ? "" : next}`, request));
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
