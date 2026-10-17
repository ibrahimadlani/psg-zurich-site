import { routing } from "@/i18n/routing";

/*
 * Where to go back after signing in. A login wall sends visitors to /login?suite=/the/page;
 * the sign-in form, the welcome step, the membership and password-reset flows carry it along,
 * and the member lands on the page they wanted. Paths are kept without the language prefix:
 * the redirect puts the current one back.
 */

export const RETURN_PARAM = "suite";
/** Set by the proxy on every page request: the page asked for (lib/auth-redirect.ts). */
export const RETURN_PATH_HEADER = "x-return-path";

/** Pages that would send the member round in circles. */
const LOOPS = /^\/(login|join|welcome)(\/|$)/;
const LOCALE_PREFIX = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);
const BASE = "http://x";

/**
 * A path of this site to go back to, or null. The only check of the project: anything that
 * is not a plain local path (other site, "//host", "/\host", control characters, too long) or
 * that would loop through the sign-in pages is refused.
 */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 512) return null;
  if (!/^\/(?![/\\])/.test(value) || /[\u0000-\u001f\u007f\\]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  url.searchParams.delete("_rsc");
  const pathname = url.pathname.replace(LOCALE_PREFIX, "") || "/";
  if (LOOPS.test(pathname)) return null;
  return `${pathname}${url.search}${url.hash}`;
}

/** `href` with the page to come back to (nothing when there is none, or it is the home page). */
export function withReturn(href: string, path: string | null | undefined) {
  const next = safeReturnPath(path);
  if (!next || next === "/") return href;
  return `${href}${href.includes("?") ? "&" : "?"}${RETURN_PARAM}=${encodeURIComponent(next)}`;
}

/** The sign-in page, coming back to `path` afterwards. */
export const signInHref = (path?: string | null) => withReturn("/login", path);
