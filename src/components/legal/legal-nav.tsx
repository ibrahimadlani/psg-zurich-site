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
    // Same as the site's one-line footer: centred and stacked on phones (club line, then the
    // documents), the club line on the left and the documents on the right from sm.
    <footer className="relative border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-x-6 gap-y-2 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[12px] text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-between sm:text-left">
        <p>© PSG Zurich · {t("official")}</p>
        <nav aria-label={t("legal")} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
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
      </div>
    </footer>
  );
}
