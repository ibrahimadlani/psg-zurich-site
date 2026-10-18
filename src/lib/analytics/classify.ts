import type { PageContentType } from "@/db/schema";
import { routing } from "@/i18n/routing";

/*
 * Reading a visit: which page (without its language), what it shows (an article, an event…),
 * on what device and browser — and whether it is a robot (not counted).
 */

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\//i;
export const isBot = (userAgent: string) => !userAgent || BOT.test(userAgent);

/** "/fr/news/x?y" → { locale: "fr", path: "/news/x" }; anything not a page of the site → null. */
export function splitPath(raw: string): { locale: string; path: string } | null {
  let pathname: string;
  try {
    pathname = new URL(raw, "https://x.invalid").pathname;
  } catch {
    return null;
  }
  const [, first = "", ...rest] = pathname.split("/");
  if (!(routing.locales as readonly string[]).includes(first)) return null;
  const path = `/${rest.join("/")}`.replace(/\/+$/, "") || "/";
  return path.length > 255 ? null : { locale: first, path };
}

/** What a page shows: "/news/<slug>" an article, "/events/<id>" an event… */
export function contentOf(path: string): { type: PageContentType; id: string | null } {
  const [, section, id, extra] = path.split("/");
  if (id && !extra) {
    if (section === "news") return { type: "article", id };
    if (section === "events") return { type: "event", id };
    if (section === "matches" && id !== "leaderboard") return { type: "match", id };
    if (section === "shop") return { type: "product", id };
  }
  return { type: "page", id: null };
}

export function deviceOf(userAgent: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function browserOf(userAgent: string) {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/opr\/|opera/i.test(userAgent)) return "Opera";
  if (/samsungbrowser/i.test(userAgent)) return "Samsung Internet";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Autre";
}

/** "https://www.google.com/search?q=…" → "google.com"; our own site → null. */
export function referrerHostOf(referrer: string | undefined, ownHost: string) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host && host !== ownHost.replace(/^www\./, "") ? host.slice(0, 191) : null;
  } catch {
    return null;
  }
}

/** API route as a pattern: ids, numbers and slugs-with-digits become ":id". */
export function routePattern(pathname: string) {
  return pathname
    .split("/")
    .map((segment) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-|^seed-|^\d+$|^[A-Za-z0-9_-]{20,}$/i.test(segment) ? ":id" : segment,
    )
    .join("/")
    .slice(0, 191);
}
