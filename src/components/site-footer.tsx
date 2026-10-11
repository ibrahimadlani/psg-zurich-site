import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  return (
    <footer className="relative border-t">
      <p className="mx-auto max-w-5xl px-4 py-6 text-center text-[14px] text-muted-foreground">
        {t("tagline")}
      </p>
    </footer>
  );
}
