import { getTranslations } from "next-intl/server";
import { BrandShell } from "@/components/brand-shell";
import { BackArrow, NotFoundHero, backLinkClass } from "@/components/not-found-hero";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <BrandShell>
      <NotFoundHero title={t("title")}>
        <Link href="/" className={backLinkClass}>
          <BackArrow />
          <span>{t("backHome")}</span>
        </Link>
      </NotFoundHero>
    </BrandShell>
  );
}
