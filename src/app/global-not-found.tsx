import type { Metadata } from "next";
import Link from "next/link";
import { BackArrow, NotFoundHero, backLinkClass } from "@/components/not-found-hero";
import { ThemeScript } from "@/components/theme-script";
import { ThemeSync } from "@/components/theme-sync";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "404 · PSG Zurich",
};

// Rendered for URLs that match no route at all (outside the [locale] layout): trilingual.
export default function GlobalNotFound() {
  return (
    <html lang="fr" className={`${fontVariables} h-full antialiased motion-safe:scroll-smooth`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-6 pb-12 leading-[normal]">
        <ThemeSync />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-diagonal" />
        <div className="relative">
          <NotFoundHero
            title={
              <>
                Page introuvable · <span lang="en">Page not found</span> ·{" "}
                <span lang="de">Seite nicht gefunden</span>
              </>
            }
          >
            <div className="flex flex-wrap justify-center gap-x-6">
              <Link href="/fr" className={backLinkClass}>
                <BackArrow />
                <span>Accueil</span>
              </Link>
              <Link href="/en" lang="en" className={backLinkClass}>
                <BackArrow />
                <span>Home</span>
              </Link>
              <Link href="/de" lang="de" className={backLinkClass}>
                <BackArrow />
                <span>Startseite</span>
              </Link>
            </div>
          </NotFoundHero>
        </div>
      </body>
    </html>
  );
}
