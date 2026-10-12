"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { headerIconButtonClass } from "@/components/header-icon-button";
import { THEME_STORAGE_KEY } from "@/components/theme-script";

function toggleTheme() {
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
