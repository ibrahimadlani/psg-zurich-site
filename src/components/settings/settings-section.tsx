import { getTranslations } from "next-intl/server";
import { SettingsBackLink } from "@/components/settings/settings-nav";
import type { SettingsSectionKey } from "@/components/settings/sections";

/** Title + description of a settings section, then its blocks separated by hairlines. */
export async function SettingsSection({ section, children }: { section: SettingsSectionKey; children: React.ReactNode }) {
  const t = await getTranslations("Settings.sections");
  return (
    <div className="space-y-6">
      <SettingsBackLink />
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{t(`${section}.title`)}</h2>
        <p className="text-sm text-muted-foreground">{t(`${section}.description`)}</p>
      </header>
      <div className="divide-y rounded-[14px] border bg-card/70 px-5 sm:px-6">{children}</div>
    </div>
  );
}

/** One block of a section: label column + content (stacked on phones). */
export function SettingsBlock({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 py-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {description ? <p className="text-sm text-pretty text-muted-foreground">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
