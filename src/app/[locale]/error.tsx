"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { inlineLinkClass } from "@/components/auth/auth-ui";
import { BareTopBar } from "@/components/bare-top-bar";
import {
  BackArrow,
  NotFoundHero,
  backLinkClass,
} from "@/components/not-found-hero";
import { Link } from "@/i18n/navigation";
import { LEGAL } from "@/lib/legal";
import { cn } from "@/lib/utils";

/**
 * Unexpected error in a page or the site layout ("500"). Same look as the 404, with the bar of
 * the sign-in screens rather than the full header (which may be what failed).
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("ServerError");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex flex-1 flex-col leading-[normal]">
      <title>{`500 · PSG Zurich`}</title>
      <BareTopBar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-6 pb-12">
        <div className="flex w-full animate-page-in flex-col items-center motion-reduce:animate-none">
          <NotFoundHero code="500" title={t("title")}>
            <p className="max-w-[26rem] text-[15px] leading-normal text-pretty text-muted-foreground">
              {t.rich("body", {
                mail: () => (
                  <a href={`mailto:${LEGAL.email}`} className={inlineLinkClass}>
                    {LEGAL.email}
                  </a>
                ),
              })}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-7">
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
                <span>{t("retry")}</span>
              </button>
              <Link href="/" className={backLinkClass}>
                <BackArrow />
                <span>{t("backHome")}</span>
              </Link>
            </div>
            {error.digest ? (
              <p className="mt-6 font-mono text-[11px] tracking-wide text-muted-foreground/80 select-all">
                {t("reference", { digest: error.digest })}
              </p>
            ) : null}
          </NotFoundHero>
        </div>
      </main>
    </div>
  );
}
