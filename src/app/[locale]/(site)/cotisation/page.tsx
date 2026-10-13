import { CircleCheck, Clock } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CopyText } from "@/components/membership/copy-text";
import { redirect } from "@/i18n/navigation";
import { isDuesPaid, seasonEnd } from "@/lib/dues";
import { LEGAL } from "@/lib/legal";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";
import { PanelSkeleton } from "@/components/skeletons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dues");
  return { title: t("title"), robots: { index: false } };
}

const card = "flex flex-col gap-4 rounded-[14px] border bg-card p-[clamp(18px,3vw,24px)] shadow-brand";
const term = "font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase";

/** The season's fee: status, amount, and how to pay it (bank transfer or TWINT). */
async function DuesContent() {
  const [t, format, locale] = await Promise.all([getTranslations("Dues"), getFormatter(), getLocale()]);
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion?suite=%2Fcotisation", locale });
  const member = await getCurrentMember();
  const day = (value: string) => format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: "long" });

  if (member?.status !== "active") {
    return (
      <section className={card}>
        <p className="flex items-center gap-2 font-semibold">
          <Clock className="size-4 text-muted-foreground" aria-hidden />
          {t("pendingTitle")}
        </p>
        <p className="text-sm text-muted-foreground">{t("pendingBody")}</p>
      </section>
    );
  }

  if (isDuesPaid(member)) {
    return (
      <section className={card}>
        <p className="flex items-center gap-2 font-semibold">
          <CircleCheck className="size-4 text-ok" aria-hidden />
          {t("paidTitle")}
        </p>
        <p className="text-sm text-muted-foreground">{t("paidBody", { date: day(member.expiresOn!) })}</p>
      </section>
    );
  }

  const reference = member.memberNumber ?? `${member.firstName} ${member.lastName}`;
  return (
    <div className="grid items-start gap-[clamp(16px,2.5vw,24px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className={card}>
        <p className={term}>{t("amountLabel", { end: day(seasonEnd()) })}</p>
        <p className="font-narrow text-[44px] leading-none font-extrabold italic">{LEGAL.statutes.fee}</p>
        <p className="text-sm text-muted-foreground">{t("amountHint", { junior: LEGAL.statutes.juniorFee })}</p>
        <p className="text-sm text-muted-foreground">{t("after")}</p>
      </section>
      <section className={card}>
        <h2 className="font-wide text-xs font-semibold tracking-[0.08em] uppercase">{t("transfer")}</h2>
        <dl className="flex flex-col divide-y">
          {[
            [t("holder"), LEGAL.payment.accountHolder],
            [t("iban"), LEGAL.payment.iban],
            [t("bank"), LEGAL.payment.bank],
            [t("reference"), reference],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <dt className={term}>{label}</dt>
                <dd className="truncate font-mono text-[14px]">{value}</dd>
              </div>
              <CopyText value={value!} />
            </div>
          ))}
        </dl>
        {LEGAL.payment.twint ? (
          <>
            <h2 className="mt-2 font-wide text-xs font-semibold tracking-[0.08em] uppercase">TWINT</h2>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">{t("twint", { number: LEGAL.payment.twint, reference })}</p>
              <CopyText value={LEGAL.payment.twint} />
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

export default async function DuesPage() {
  const t = await getTranslations("Dues");
  return (
    <div className="flex flex-col gap-[clamp(24px,4vw,36px)]">
      <div className="flex flex-col gap-3">
        <h1 className="font-narrow text-[length:clamp(40px,8vw,72px)] leading-[0.9] font-extrabold uppercase italic">
          {t("title")}
        </h1>
        <p className="max-w-[36rem] text-base text-pretty text-muted-foreground">{t("intro")}</p>
      </div>
      <Suspense fallback={<PanelSkeleton />}>
        <DuesContent />
      </Suspense>
    </div>
  );
}
