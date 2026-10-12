import { ArrowUpRight, Handshake, Mail, MapPin, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CopyEmailButton } from "@/components/contact/copy-email-button";
import { MAPS_URL, ZurichMap } from "@/components/contact/zurich-map";
import { Link } from "@/i18n/navigation";
import { LEGAL } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contact");
  return { title: t("title"), description: t("intro") };
}

const card = "flex flex-col gap-3 rounded-[14px] border bg-card p-[clamp(18px,2.5vw,24px)] shadow-brand";
const icon = "grid size-9 place-items-center rounded-full bg-psg-blue text-white";
const cardTitle = "font-wide text-[11px] font-semibold tracking-[0.08em] uppercase";
const textLink =
  "inline-flex items-center gap-1 self-start border-b pb-0.5 text-[14px] text-foreground transition-colors hover:border-brand-red";

export default async function ContactPage() {
  const t = await getTranslations("Contact");
  const email = LEGAL.email;
  const partnersHref = `mailto:${email}?subject=${encodeURIComponent(t("partnersSubject"))}`;

  return (
    <div className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <div className="flex flex-col gap-3.5">
        <h1 className="font-narrow text-[length:clamp(44px,9vw,88px)] leading-[0.88] font-extrabold tracking-[-0.01em] uppercase italic">
          {t("title")}
        </h1>
        <p className="max-w-[36rem] text-base leading-normal text-pretty text-muted-foreground">{t("intro")}</p>
      </div>

      <div className="grid items-start gap-[clamp(16px,2.5vw,24px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="flex flex-col gap-[clamp(16px,2.5vw,24px)]">
          {/* Main way in: the club's address. */}
          <section className={card}>
            <span className={icon}>
              <Mail className="size-4" aria-hidden />
            </span>
            <h2 className={cardTitle}>{t("writeTitle")}</h2>
            <a
              href={`mailto:${email}`}
              className="font-narrow text-[length:clamp(24px,3.4vw,30px)] leading-none font-extrabold break-all italic underline-offset-4 hover:underline"
            >
              {email}
            </a>
            <p className="text-[14px] text-muted-foreground">{t("writeBody")}</p>
            <div>
              <CopyEmailButton email={email} />
            </div>
          </section>

          <div className="grid gap-[clamp(16px,2.5vw,24px)] sm:grid-cols-2 lg:grid-cols-1">
            <section className={card}>
              <span className={icon}>
                <UserPlus className="size-4" aria-hidden />
              </span>
              <h2 className={cardTitle}>{t("joinTitle")}</h2>
              <p className="text-[14px] leading-normal text-muted-foreground">{t("joinBody")}</p>
              <Link href="/adhesion" prefetch={false} className={textLink}>
                {t("joinLink")}
              </Link>
            </section>
            <section className={card}>
              <span className={icon}>
                <Handshake className="size-4" aria-hidden />
              </span>
              <h2 className={cardTitle}>{t("partnersTitle")}</h2>
              <p className="text-[14px] leading-normal text-muted-foreground">{t("partnersBody")}</p>
              <a href={partnersHref} className={textLink}>
                {t("partnersLink")}
              </a>
            </section>
          </div>
        </div>

        <section className="flex flex-col gap-3 lg:sticky lg:top-6">
          <ZurichMap label={t("mapLabel")} />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-[14px]">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {t("location")}
            </span>
            <a href={MAPS_URL} target="_blank" rel="noreferrer" className={textLink}>
              {t("openMap")}
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
