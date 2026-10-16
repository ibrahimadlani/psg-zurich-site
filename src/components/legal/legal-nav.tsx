"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const DOCUMENTS = [
  { href: "/statuts", key: "statutes" },
  { href: "/mentions-legales", key: "imprint" },
  { href: "/confidentialite", key: "privacy" },
] as const;

/** At the foot of the legal pages: the three documents (the current one marked) and the club line. */
export function LegalNav() {
  const t = useTranslations("Footer");
  const pathname = usePathname();
  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-4 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-[12px] text-muted-foreground">
      <nav aria-label={t("legal")} className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        {DOCUMENTS.map((document) => {
          const current = pathname === document.href;
          return (
            <Link
              key={document.href}
              href={document.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "border-b pb-px transition-colors",
                current ? "border-psg-red text-foreground" : "border-transparent hover:text-foreground",
              )}
            >
              {t(document.key)}
            </Link>
          );
        })}
      </nav>
      <p>© PSG Zurich · {t("official")}</p>
    </footer>
  );
}
