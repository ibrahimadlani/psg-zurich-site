import type { AppLocale } from "./routing";

export async function loadMessages(locale: AppLocale) {
  return (await import(`../../messages/${locale}.json`)).default;
}
