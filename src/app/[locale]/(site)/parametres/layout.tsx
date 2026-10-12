import { getTranslations } from "next-intl/server";
import { SettingsNav } from "@/components/settings/settings-nav";

/** Settings: side menu (from md) + the section. Each page checks the session itself. */
export default async function SettingsLayout({ children }: LayoutProps<"/[locale]/parametres">) {
  const t = await getTranslations("Settings");
  return (
    <div className="space-y-8">
      {/* On phones only the section list shows this title; sections have a back link instead. */}
      <h1 className="hidden text-3xl font-bold tracking-tight md:block">{t("title")}</h1>
      <div className="grid items-start gap-10 md:grid-cols-[13rem_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
