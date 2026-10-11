import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals and the real static files of public/ and app/.
  // Other paths (even "/xyz.txt") get a locale prefix, then the localized 404.
  matcher: "/((?!api|_next|_vercel|brand/|robots\\.txt|icon\\.svg|favicon\\.ico).*)",
};
