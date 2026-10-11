import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Display order of the language switcher.
  locales: ["fr", "en", "de"],
  defaultLocale: "fr",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
