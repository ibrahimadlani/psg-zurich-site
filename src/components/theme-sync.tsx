"use client";

import { useLayoutEffect } from "react";
import { THEME_STORAGE_KEY } from "@/components/theme-script";

function applyStoredTheme() {
  const root = document.documentElement;
  let dark = false;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    dark = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    dark = matchMedia("(prefers-color-scheme: dark)").matches;
  }
  if (root.classList.contains("dark") !== dark) root.classList.toggle("dark", dark);
  const scheme = dark ? "dark" : "light";
  if (root.style.colorScheme !== scheme) root.style.colorScheme = scheme;
}

/**
 * Re-applies the theme whenever React rewrites <html>: when a page turns into its 404 during
 * streaming, React rebuilds the document and drops what the inline ThemeScript had set.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyStoredTheme();
    const observer = new MutationObserver(applyStoredTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    // "System" theme: follow the OS when it switches (no stored choice).
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", applyStoredTheme);
    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", applyStoredTheme);
    };
  }, []);
  return null;
}
