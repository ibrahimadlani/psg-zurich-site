"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";
import {
  BackArrow,
  NotFoundHero,
  backLinkClass,
} from "@/components/not-found-hero";
import { ThemeScript } from "@/components/theme-script";
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import "./globals.css";

/**
 * Last-resort "500" when the root layout itself fails: no translations or site chrome are
 * available here, so the page is trilingual like the global 404.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html
      lang="fr"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <title>500 · PSG Zurich</title>
        <ThemeScript />
      </head>
      <body className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-6 pb-12 leading-[normal]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-diagonal"
        />
        <div className="relative">
          <NotFoundHero
            code="500"
            title={
              <>
                Une erreur est survenue ·{" "}
                <span lang="en">Something went wrong</span> ·{" "}
                <span lang="de">Ein Fehler ist aufgetreten</span>
              </>
            }
          >
            <div className="flex flex-wrap justify-center gap-x-7">
              <button
                type="button"
                onClick={() => retry()}
                className={cn(backLinkClass, "cursor-pointer")}
              >
                <RotateCw
                  aria-hidden
                  className="size-3.5 shrink-0"
                  strokeWidth={1.75}
                />
                <span>
                  Réessayer · <span lang="en">Retry</span>
                </span>
              </button>
              <Link href="/" className={backLinkClass}>
                <BackArrow />
                <span>
                  Accueil · <span lang="en">Home</span>
                </span>
              </Link>
            </div>
            {error.digest ? (
              <p className="mt-6 font-mono text-[11px] tracking-wide text-muted-foreground/80 select-all">
                Ref. {error.digest}
              </p>
            ) : null}
          </NotFoundHero>
        </div>
      </body>
    </html>
  );
}
