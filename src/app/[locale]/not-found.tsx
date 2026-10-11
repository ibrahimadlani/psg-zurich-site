import { getTranslations } from "next-intl/server";
import { BrandShell } from "@/components/brand-shell";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <BrandShell>
      <div className="flex max-w-[34rem] flex-col items-center gap-3 text-center">
        <h1 className="font-narrow text-5xl leading-[0.95] font-extrabold uppercase italic">
          {t("title")}
        </h1>
        <p className="text-[17px] leading-[1.55] text-muted-foreground">{t("description")}</p>
        <Button asChild className="mt-3">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </BrandShell>
  );
}
