import { routing } from "@/i18n/routing";

/** Public address of the site, for absolute links in metadata (the production domain by default). */
export const publicSiteUrl = () => (process.env.BETTER_AUTH_URL || "https://psg-zurich.ch").replace(/\/$/, "");

/** hreflang map of a page that exists in every language ("/matchs" → fr, en, de and x-default). */
export function localeAlternates(path: string) {
  const suffix = path === "/" ? "" : path;
  return {
    ...Object.fromEntries(routing.locales.map((locale) => [locale, `/${locale}${suffix}`])),
    "x-default": `/${routing.defaultLocale}${suffix}`,
  };
}
