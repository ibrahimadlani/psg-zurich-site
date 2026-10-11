"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
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
      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[8px] border bg-card text-foreground [transition:background-color_.2s,transform_.15s] hover:bg-accent active:scale-[0.92]"
    >
      {/* Icon follows the <html> class set before paint, so no hydration mismatch. */}
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
    </button>
  );
}
