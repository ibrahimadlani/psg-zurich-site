import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LanguageForm, ThemeForm } from "@/components/settings/preferences-form";
import { SettingsBlock, SettingsSection } from "@/components/settings/settings-section";
import { getSettingsContext } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings.sections");
  return { title: t("preferences.title"), robots: { index: false } };
}

async function Content() {
  const t = await getTranslations("Settings.preferences");
  await getSettingsContext();
  return (
    <>
      <SettingsBlock title={t("language")} description={t("languageDescription")}>
        <LanguageForm />
      </SettingsBlock>
      <SettingsBlock title={t("theme")} description={t("themeDescription")}>
        <ThemeForm />
      </SettingsBlock>
    </>
  );
}

export default function PreferencesSettingsPage() {
  return (
    <SettingsSection section="preferences">
      <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">…</p>}>
        <Content />
      </Suspense>
    </SettingsSection>
  );
}
