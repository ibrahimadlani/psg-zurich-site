import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { loadMessages } from "./messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale: override }) => {
  // Route handlers can't read root params yet: they pass the locale explicitly.
  const locale = override ?? (await rootParams.locale());
  if (!hasLocale(routing.locales, locale)) notFound();

  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: "Europe/Zurich",
  };
});
