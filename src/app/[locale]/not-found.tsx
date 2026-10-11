import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Button asChild>
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </>
  );
}
