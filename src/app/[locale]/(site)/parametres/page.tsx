import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SETTINGS_SECTIONS } from "@/components/settings/sections";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");
  return { title: t("title"), robots: { index: false } };
}

/** Section list: the entry point on phones, an overview next to the menu on larger screens. */
export default async function SettingsIndexPage() {
  const t = await getTranslations("Settings.sections");
  const tSettings = await getTranslations("Settings");
  return (
    <>
    {/* Phones: the layout title is hidden, this one replaces it (only one is ever displayed). */}
    <h1 className="mb-6 text-3xl font-bold tracking-tight md:hidden">{tSettings("title")}</h1>
    <ul className="divide-y overflow-hidden rounded-[14px] border bg-card/70">
      {SETTINGS_SECTIONS.map(({ slug, key, icon: Icon }) => (
        <li key={slug}>
          <Link href={`/parametres/${slug}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.03]">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/5">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{t(`${key}.title`)}</span>
              <span className="block text-sm text-muted-foreground">{t(`${key}.description`)}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
    </>
  );
}
