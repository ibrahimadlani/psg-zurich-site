"use client";

export const THEME_STORAGE_KEY = "psgz-theme";

// Runs before the first paint: saved choice first, then the OS preference.
const script = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;

/** Render inside <head> of a root layout, with `suppressHydrationWarning` on <html>, plus <ThemeSync />. */
export function ThemeScript() {
  // Only the server-rendered copy runs. When React re-creates the root layout in the browser
  // (e.g. on a 404) it would warn about an inert script: render that copy as a data block
  // instead — ThemeSync re-applies the theme in that case.
  return (
    <script
      type={typeof window === "undefined" ? undefined : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
