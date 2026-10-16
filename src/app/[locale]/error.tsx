"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { inlineLinkClass } from "@/components/auth/auth-ui";
import { BackArrow, backLinkClass } from "@/components/not-found-hero";
import { StatusScreen, statusBodyClass } from "@/components/status-screen";
import { Link } from "@/i18n/navigation";
import { LEGAL } from "@/lib/legal";
import { cn } from "@/lib/utils";

/**
 * Unexpected error in a page or the site layout ("500"): the same screen as the 404.
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
    <StatusScreen code="500" title={t("title")}>
      <p className={statusBodyClass}>
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
          <RotateCw aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
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
    </StatusScreen>
  );
}
