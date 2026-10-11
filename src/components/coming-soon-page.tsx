import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";

type Section = "news" | "matches" | "events" | "membership" | "contact";

export async function ComingSoonPage({ section }: { section: Section }) {
  const t = await getTranslations("Pages");
  return (
    <>
      <PageHeader title={t(`${section}.title`)} description={t(`${section}.description`)} />
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {t("comingSoon")}
      </p>
    </>
  );
}

export async function comingSoonMetadata(section: Section) {
  const t = await getTranslations("Pages");
  return { title: t(`${section}.title`), description: t(`${section}.description`) };
}
