"use client";

import { ArrowRight, Check, Hourglass } from "lucide-react";
import { useFormatter, useNow, useTimeZone, useTranslations } from "next-intl";
import { useTransition } from "react";
import { SignInLink } from "@/components/auth/sign-in-link";
import { Link, useRouter } from "@/i18n/navigation";
import { dayIn } from "@/lib/human-date";
import { sendAttendance } from "@/lib/event-attendance";
import { cn } from "@/lib/utils";

type Props = {
  eventId: string;
  status: "registered" | "waitlisted" | "cancelled" | "attended" | null;
  full: boolean;
  access: "member" | "guest" | "inactive";
  /** Sign-ups close when the event starts. */
  phase: "open" | "started" | "over";
  startsAt: Date;
};

const primaryButton =
  "inline-flex h-11 cursor-pointer items-center gap-2 self-start rounded-[8px] bg-segment px-[22px] font-wide text-xs font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-60 [&_svg]:size-3";

/** Event page sign-up: "You're registered" banner, waitlist banner, or the main call to action. */
export function EventRegistration({ eventId, status, full, access, phase, startsAt }: Props) {
  const t = useTranslations("Events");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const send = (method: "POST" | "DELETE") =>
    startTransition(async () => {
      await sendAttendance(eventId, method, t);
      router.refresh();
    });

  if (phase !== "open") return <p className="text-[15px] text-muted-foreground">{t(phase === "over" ? "over" : "started")}</p>;

  if (status === "registered" || status === "waitlisted") {
    return <Confirmation waitlisted={status === "waitlisted"} startsAt={startsAt} pending={pending} onLeave={() => send("DELETE")} />;
  }

  if (access === "guest") {
    return (
      <SignInLink next={`/events/${eventId}`} className={primaryButton}>
        {t("signInToJoin")}
        <ArrowRight aria-hidden />
      </SignInLink>
    );
  }
  if (access === "inactive") return <p className="text-[15px] text-muted-foreground">{t("membersOnlySignup")}</p>;

  return (
    <div className="flex flex-col gap-2">
      <button type="button" disabled={pending} onClick={() => send("POST")} className={primaryButton}>
        {full ? t("joinWaitlist") : t("register")}
        <ArrowRight aria-hidden />
      </button>
      {full ? <p className="text-sm text-muted-foreground">{t("waitlistHint")}</p> : null}
    </div>
  );
}

const label = "font-wide text-[10px] font-semibold tracking-[0.08em] uppercase";

/** "À demain !", "À samedi !", "À tout à l'heure !"… from the event's date. */
function useSeeYou(startsAt: Date) {
  const t = useTranslations("Events.confirmation");
  const format = useFormatter();
  const timeZone = useTimeZone() ?? "Europe/Zurich";
  const now = useNow({ updateInterval: 60_000 });
  const days = Math.round((Date.parse(dayIn(startsAt, timeZone)) - Date.parse(dayIn(now, timeZone))) / 86_400_000);
  if (days <= 0) return t("seeYouToday");
  if (days === 1) return t("seeYouTomorrow");
  // Within the week: "À samedi !"; further: "Rendez-vous le 7 novembre !".
  return days < 7
    ? t("seeYou", { when: format.dateTime(startsAt, { weekday: "long" }) })
    : t("seeYouOn", { when: format.dateTime(startsAt, { day: "numeric", month: "long" }) });
}

/**
 * After signing up, a clean ticket instead of a banner: the shirt's banner on the edge, a
 * friendly "See you Saturday!", one useful line, and a quiet way out.
 */
function Confirmation({
  waitlisted,
  startsAt,
  pending,
  onLeave,
}: {
  waitlisted: boolean;
  startsAt: Date;
  pending: boolean;
  onLeave: () => void;
}) {
  const t = useTranslations("Events");
  const seeYou = useSeeYou(startsAt);
  return (
    <div role="status" className="relative animate-page-in overflow-hidden rounded-[12px] border bg-card px-5 py-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-1.5">
          <p className={cn(label, "inline-flex items-center gap-1.5", waitlisted ? "text-muted-foreground" : "text-ok")}>
            {waitlisted ? <Hourglass className="size-3" aria-hidden /> : <Check className="size-3" strokeWidth={3} aria-hidden />}
            {t(waitlisted ? "confirmation.waitlistedLabel" : "confirmation.registeredLabel")}
          </p>
          <p className="font-narrow text-[length:clamp(26px,5vw,32px)] leading-[0.95] font-extrabold uppercase italic">
            {waitlisted ? t("confirmation.waitlistedTitle") : seeYou}
          </p>
          <p className="text-sm text-pretty text-muted-foreground">
            {waitlisted
              ? t("confirmation.waitlistedBody")
              : t.rich("confirmation.registeredBody", {
                  card: (chunks) => (
                    <Link href="/member#carte" prefetch={false} className="border-b text-foreground transition-colors hover:border-psg-red">
                      {chunks}
                    </Link>
                  ),
                })}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={onLeave}
          className="cursor-pointer text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-psg-red hover:underline disabled:opacity-50"
        >
          {t(waitlisted ? "leaveWaitlist" : "cancel")}
        </button>
      </div>
    </div>
  );
}
