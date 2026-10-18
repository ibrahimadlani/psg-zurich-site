import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { DonationForm } from "@/components/payments/donation-form";
import { PanelSkeleton } from "@/components/skeletons";
import { getSession } from "@/lib/permissions";
import { paymentsEnabled } from "@/lib/payments/stripe";
import { LEGAL } from "@/lib/legal";
import { Streamed } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Support");
  return { title: t("title"), description: t("intro") };
}

async function Donate() {
  await connection();
  const [t, session] = await Promise.all([getTranslations("Support"), getSession()]);
  if (!paymentsEnabled()) {
    return <p className="text-[15px] text-muted-foreground">{t("unavailable", { email: LEGAL.email })}</p>;
  }
  return <DonationForm signedIn={session !== null} />;
}

/** Support the club: a donation in a few taps, open to everyone. */
export default async function SupportPage() {
  const t = await getTranslations("Support");
  return (
    <div className="grid items-start gap-[clamp(28px,4vw,48px)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <header className="flex flex-col gap-4 lg:sticky lg:top-6">
        <h1 className="font-narrow text-[length:clamp(44px,9vw,88px)] leading-[0.88] font-extrabold uppercase italic">{t("title")}</h1>
        <p className="max-w-[32rem] text-base leading-normal text-pretty text-muted-foreground">{t("intro")}</p>
        <ul className="flex flex-col gap-2 text-[14px]">
          {(["uses.events", "uses.travel", "uses.tifo"] as const).map((key) => (
            <li key={key} className="flex items-start gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-psg-red" />
              {t(key)}
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-muted-foreground">{t("taxNote")}</p>
      </header>
      <section className="rounded-[16px] border bg-card/60 p-[clamp(18px,3vw,28px)] shadow-brand">
        <Streamed fallback={<PanelSkeleton />}>
          <Donate />
        </Streamed>
      </section>
    </div>
  );
}
