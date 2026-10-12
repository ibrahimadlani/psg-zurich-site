import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { AnnouncementBanner } from "@/components/announcements/announcement-banner";
import { SessionSync } from "@/components/auth/session-sync";
import { ThemeScript } from "@/components/theme-script";
import { ThemeSync } from "@/components/theme-sync";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();

  return (
    // The theme script may add the "dark" class before React hydrates.
    // scroll-smooth: in-page anchors glide; data-scroll-behavior keeps page navigations instant.
    <html lang={locale} className={`${fontVariables} h-full antialiased motion-safe:scroll-smooth`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeSync />
        {/* Diagonal-line backdrop behind every page. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-diagonal" />
        <NextIntlClientProvider>
          <SessionSync />
          <Suspense fallback={null}>
            <AnnouncementBanner />
          </Suspense>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
