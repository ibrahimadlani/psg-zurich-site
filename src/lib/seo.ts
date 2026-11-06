import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

/** Public address of the site, for absolute links in metadata (the production domain by default). */
export const publicSiteUrl = () => (process.env.BETTER_AUTH_URL || "https://psg-zurich.ch").replace(/\/$/, "");

/** hreflang map of a page that exists in every language ("/matches" → fr, en, de and x-default). */
export function localeAlternates(path: string) {
  const suffix = path === "/" ? "" : path;
  return {
    ...Object.fromEntries(routing.locales.map((locale) => [locale, `/${locale}${suffix}`])),
    // The home's own address picks the visitor's language; other pages fall back to French.
    "x-default": path === "/" ? "/" : `/${routing.defaultLocale}${suffix}`,
  };
}

/** The image shown when a page without its own picture is shared (public/brand/og-*.png). */
export const shareImage = (locale: string) => ({ url: `/brand/og-${locale}.png`, width: 1200, height: 630, type: "image/png" });

export const ogLocale = (locale: string) => `${locale}_CH`;

/**
 * The metadata of a public page that exists in every language: title and description, its
 * canonical address (without ?parameters), its versions in the other languages and how it looks
 * when shared. `absoluteTitle`: without the " · PSG Zurich" ending (the home page).
 */
export async function pageMetadata({ path, title, description, absoluteTitle = false }: { path: string; title: string; description: string; absoluteTitle?: boolean }): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Metadata")]);
  const url = `/${locale}${path === "/" ? "" : path}`;
  const image = shareImage(locale);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: localeAlternates(path) },
    openGraph: { type: "website", siteName: t("title"), locale: ogLocale(locale), url, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
