import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ThemeScript } from "@/components/theme-script";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "404 · PSG Zurich",
};

// Rendered for URLs that match no route at all (outside the [locale] layout).
export default function GlobalNotFound() {
  return (
    <html lang="fr" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden p-6 text-center leading-[normal]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-diagonal" />
        <Image src="/brand/psg-crest.svg" alt="" width={64} height={64} className="relative" />
        <h1 className="relative font-narrow text-6xl leading-[0.95] font-extrabold uppercase italic">
          404
        </h1>
        <p className="relative text-[17px] text-muted-foreground">
          Page introuvable · <span lang="en">Page not found</span> ·{" "}
          <span lang="de">Seite nicht gefunden</span>
        </p>
        <p className="relative font-wide text-[15px]">
          <Link href="/fr">Accueil</Link> ·{" "}
          <Link href="/en" lang="en">
            Home
          </Link>{" "}
          ·{" "}
          <Link href="/de" lang="de">
            Startseite
          </Link>
        </p>
      </body>
    </html>
  );
}
