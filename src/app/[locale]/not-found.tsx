import { getTranslations } from "next-intl/server";
import { BackArrow, backLinkClass } from "@/components/not-found-hero";
import { StatusScreen, statusBodyClass } from "@/components/status-screen";
import { Link } from "@/i18n/navigation";

/** Unknown page ("404"): the same screen as the 500. */
export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <StatusScreen code="404" title={t("title")}>
      <p className={statusBodyClass}>{t("body")}</p>
      <div className="flex flex-wrap items-center justify-center gap-x-7">
        <Link href="/" className={backLinkClass}>
          <BackArrow />
          <span>{t("backHome")}</span>
        </Link>
      </div>
    </StatusScreen>
  );
}
