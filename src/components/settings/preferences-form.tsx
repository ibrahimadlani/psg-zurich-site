"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { readThemePreference, setThemePreference, type ThemePreference } from "@/components/theme-toggle";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const option = (active: boolean) =>
  cn(
    "flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3.5 py-3 text-sm transition-colors",
    active ? "border-psg-blue bg-psg-blue/5 font-semibold dark:border-foreground dark:bg-foreground/5" : "hover:border-foreground/30",
  );

/** Account language: site and emails. */
export function LanguageForm() {
  const t = useTranslations("Settings.preferences");
  const tLocale = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const choose = (next: (typeof routing.locales)[number]) =>
    startTransition(async () => {
      const response = await fetch("/api/v1/me/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      if (!response.ok) {
        toast.error(t("error"));
        return;
      }
      if (next !== locale) router.replace(pathname, { locale: next });
      else router.refresh();
    });

  return (
    <fieldset className="space-y-2" disabled={pending}>
      <legend className="sr-only">{t("language")}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {routing.locales.map((code) => (
          <label key={code} className={option(code === locale)}>
            <input type="radio" name="language" value={code} checked={code === locale} onChange={() => choose(code)} className="sr-only" />
            <span className="font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{code}</span>
            {tLocale(code)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/** Theme of this device: light, dark or the system's. */
export function ThemeForm() {
  const t = useTranslations("Settings.preferences");
  const stored = useSyncExternalStore(subscribe, readThemePreference, () => "system" as ThemePreference);
  const [choice, setChoice] = useState<ThemePreference | null>(null);
  const current = choice ?? stored;
  const options = [
    { value: "light", icon: Sun },
    { value: "dark", icon: Moon },
    { value: "system", icon: Monitor },
  ] as const;

  return (
    <fieldset className="grid gap-2 sm:grid-cols-3">
      <legend className="sr-only">{t("theme")}</legend>
      {options.map(({ value, icon: Icon }) => (
        <label key={value} className={option(value === current)}>
          <input
            type="radio"
            name="theme"
            value={value}
            checked={value === current}
            onChange={() => {
              setThemePreference(value);
              setChoice(value);
            }}
            className="sr-only"
          />
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {t(`themes.${value}`)}
        </label>
      ))}
    </fieldset>
  );
}
