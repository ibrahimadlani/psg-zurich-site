"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { SETTINGS_SECTIONS } from "@/components/settings/sections";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Side menu (from md). */
export function SettingsNav() {
  const t = useTranslations("Settings.sections");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="sticky top-6 hidden md:block">
      <ul className="flex flex-col gap-0.5 border-l">
        {SETTINGS_SECTIONS.map(({ slug, key, icon: Icon }) => {
          const href = `/parametres/${slug}`;
          const active = pathname === href;
          return (
            <li key={slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-ml-px flex items-center gap-2.5 border-l-2 py-2 pl-4 text-sm transition-colors",
                  active
                    ? "border-psg-blue font-semibold text-foreground dark:border-foreground"
                    : "border-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {t(`${key}.title`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** "← Settings" on phones, where the side menu is hidden. */
export function SettingsBackLink() {
  const t = useTranslations("Settings");
  return (
    <Link href="/parametres" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground md:hidden">
      <ArrowLeft className="size-3.5" aria-hidden />
      {t("title")}
    </Link>
  );
}
