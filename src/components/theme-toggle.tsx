"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { headerIconButtonClass } from "@/components/header-icon-button";
import { THEME_STORAGE_KEY } from "@/components/theme-script";

export function toggleTheme() {
  const root = document.documentElement;
  const dark = !root.classList.contains("dark");
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    // Private mode: the choice simply isn't remembered.
  }
}

export type ThemePreference = "light" | "dark" | "system";

/** Stored choice of this device; "system" when none (follows the OS). */
export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

/** Settings page: light, dark, or follow the OS (the header toggle sets light or dark). */
export function setThemePreference(preference: ThemePreference) {
  const dark = preference === "system" ? matchMedia("(prefers-color-scheme: dark)").matches : preference === "dark";
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode: the choice simply isn't remembered.
  }
}

export function ThemeToggle() {
  const t = useTranslations("ThemeToggle");
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t("label")}
      title={t("label")}
      className={headerIconButtonClass}
    >
      {/* Icon follows the <html> class set before paint, so no hydration mismatch. */}
      <Sun className="hidden size-3.5 dark:block" aria-hidden />
      <Moon className="size-3.5 dark:hidden" aria-hidden />
    </button>
  );
}
