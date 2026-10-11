export const THEME_STORAGE_KEY = "psgz-theme";

// Runs before the first paint: saved choice first, then the OS preference.
const script = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;

/** Render inside <head> of a root layout, with `suppressHydrationWarning` on <html>. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
