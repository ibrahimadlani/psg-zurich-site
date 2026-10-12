import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BrandShell } from "@/components/brand-shell";

export async function generateMetadata(): Promise<Metadata> {
  const [t, site] = await Promise.all([getTranslations("ComingSoon"), getTranslations("Metadata")]);
  // The layout's title template only applies to child segments, not to this page.
  return { title: { absolute: `${t("title")} · ${site("title")}` } };
}

export default async function ComingSoonPage() {
  const t = await getTranslations("ComingSoon");

  return (
    <BrandShell>
      <div className="flex max-w-[34rem] flex-col items-center gap-3 text-center">
        <span className="font-wide text-[12px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {t("eyebrow")}
        </span>
        <h1 className="font-narrow text-[length:clamp(48px,9vw,88px)] leading-[0.95] font-extrabold tracking-normal text-balance uppercase italic">
          {t("title")}
        </h1>
        <p className="text-[17px] leading-[1.55] text-pretty text-muted-foreground">{t("body")}</p>
        <a
          href="mailto:contact@psg-zurich.ch"
          className="mt-3 border-b pb-[3px] font-wide text-[15px] tracking-[0.02em] text-foreground transition-colors hover:border-brand-red"
        >
          contact@psg-zurich.ch
        </a>
      </div>
    </BrandShell>
  );
}
