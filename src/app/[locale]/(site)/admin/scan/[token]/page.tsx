import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { CheckInButton } from "@/components/admin/checkin-button";
import { redirect } from "@/i18n/navigation";
import { isDuesPaid } from "@/lib/dues";
import { eventsAroundNow, memberByCardToken } from "@/lib/member-card";
import { getSession } from "@/lib/permissions";
import { hasRole } from "@/lib/roles";

// Tokens only exist at runtime: rendered at request time.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Scan");
  return { title: t("title"), robots: { index: false } };
}

const card = "flex flex-col gap-3 rounded-[14px] border bg-card p-[clamp(16px,3vw,22px)] shadow-brand";

/**
 * What an organiser sees after scanning a member card: who it is, whether the fee is paid,
 * and today's club events with a button to let them in.
 */
async function ScanContent({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const [t, format, locale] = await Promise.all([getTranslations("Scan"), getFormatter(), getLocale()]);
  const session = await getSession();
  if (!session) return redirect({ href: `/connexion?suite=${encodeURIComponent(`/admin/scan/${token}`)}`, locale });
  if (!hasRole(session.user.role, "admin")) return <p className="text-destructive">{t("forbidden")}</p>;

  const member = await memberByCardToken(token);
  if (!member) {
    return (
      <section className={card}>
        <p className="flex items-center gap-2 font-semibold text-destructive">
          <CircleAlert className="size-5" aria-hidden />
          {t("unknown")}
        </p>
        <p className="text-sm text-muted-foreground">{t("unknownHint")}</p>
      </section>
    );
  }

  const name = `${member.firstName} ${member.lastName}`;
  const today = await eventsAroundNow(member.id);

  const state =
    member.status !== "active" ? "notAccepted" : isDuesPaid(member) ? "paid" : "unpaid";
  const State = state === "paid" ? CircleCheck : state === "unpaid" ? Clock : CircleAlert;

  return (
    <div className="flex flex-col gap-4">
      <section className={card}>
        <p className="font-narrow text-[length:clamp(28px,6vw,40px)] leading-none font-extrabold uppercase italic">{name}</p>
        {member.memberNumber ? <p className="font-mono text-sm text-muted-foreground">{member.memberNumber}</p> : null}
        <p
          className={
            state === "paid"
              ? "flex items-center gap-2 text-sm font-semibold text-ok"
              : "flex items-center gap-2 text-sm font-semibold text-destructive"
          }
        >
          <State className="size-4" aria-hidden />
          {t(`state.${state}`)}
        </p>
      </section>

      <h2 className="font-wide text-xs font-semibold tracking-[0.08em] uppercase">{t("today")}</h2>
      {today.length === 0 ? <p className="text-sm text-muted-foreground">{t("noEvent")}</p> : null}
      {today.map((event) => (
        <section key={event.id} className={card}>
          <div>
            <p className="font-semibold">{event.title}</p>
            <p className="text-sm text-muted-foreground">
              {format.dateTime(event.startsAt, { weekday: "long", hour: "2-digit", minute: "2-digit" })}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
          {event.checkedInAt ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-ok">
              <CircleCheck className="size-4" aria-hidden />
              {t("present", { time: format.dateTime(event.checkedInAt, { hour: "2-digit", minute: "2-digit" }) })}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {event.status === "registered"
                  ? t("registered")
                  : event.status === "waitlisted"
                    ? t("waitlisted")
                    : t("notRegistered")}
              </p>
              <CheckInButton eventId={event.id} token={token} name={member.firstName} />
            </>
          )}
        </section>
      ))}
    </div>
  );
}

export default async function ScanPage({ params }: PageProps<"/[locale]/admin/scan/[token]">) {
  const t = await getTranslations("Scan");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <h1 className="font-wide text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{t("title")}</h1>
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <ScanContent params={params} />
      </Suspense>
    </div>
  );
}
