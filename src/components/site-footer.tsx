import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground md:flex-row md:justify-between">
        <p>{t("tagline")}</p>
        <a href="mailto:contact@psg-zurich.ch" className="hover:text-foreground">
          contact@psg-zurich.ch
        </a>
      </div>
    </footer>
  );
}
