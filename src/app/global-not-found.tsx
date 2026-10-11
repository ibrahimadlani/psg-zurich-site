import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "404 · PSG Zurich",
};

// Rendered for URLs that match no route at all (outside the [locale] layout).
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center justify-center p-6 font-sans">
        <main className="space-y-4 text-center">
          <p className="text-3xl font-black">
            <span className="text-primary">PSG</span> <span className="text-brand-red">Zurich</span>
          </p>
          <h1 className="text-xl font-semibold">
            Page introuvable · <span lang="de">Seite nicht gefunden</span>
          </h1>
          <p>
            <Link href="/fr" className="underline">Accueil</Link>
            {" · "}
            <Link href="/de" lang="de" className="underline">Startseite</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
