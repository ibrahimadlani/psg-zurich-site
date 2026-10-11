import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NotFound");
  return { title: t("title").replace(/\.$/, "") };
}

// Unknown paths under a locale get the localized 404 (with header) instead of the global one.
export default function CatchAll() {
  notFound();
}
