"use client";

import { ArrowRight, Check, Hourglass } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { sendAttendance } from "@/lib/event-attendance";
import { cn } from "@/lib/utils";

type Props = {
  eventId: string;
  status: "registered" | "waitlisted" | "cancelled" | "attended" | null;
  full: boolean;
  access: "member" | "guest" | "inactive";
  /** Sign-ups close when the event starts. */
  phase: "open" | "started" | "over";
};

const primaryButton =
  "inline-flex h-11 cursor-pointer items-center gap-2 self-start rounded-[8px] bg-segment px-[22px] font-wide text-xs font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-60 [&_svg]:size-3";

/** Event page sign-up: "You're registered" banner, waitlist banner, or the main call to action. */
export function EventRegistration({ eventId, status, full, access, phase }: Props) {
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
    const waitlisted = status === "waitlisted";
    return (
      <div className="space-y-2">
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-[10px] border px-4 py-3.5",
            waitlisted ? "border-foreground/15 bg-card" : "border-ok/30 bg-[color-mix(in_oklch,var(--ok)_10%,var(--card))]",
          )}
        >
          <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold">
            <span
              className={cn(
                "inline-flex size-5 items-center justify-center rounded-full text-white [&_svg]:size-[11px]",
                waitlisted ? "bg-foreground/50" : "bg-ok",
              )}
            >
              {waitlisted ? <Hourglass aria-hidden strokeWidth={3} /> : <Check aria-hidden strokeWidth={3} />}
            </span>
            {t(waitlisted ? "waitlistedBanner" : "registeredBanner")}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => send("DELETE")}
            className="cursor-pointer border-b pt-1 pb-0.5 text-sm text-muted-foreground transition-colors hover:border-psg-red hover:text-psg-red"
          >
            {t(waitlisted ? "leaveWaitlist" : "cancel")}
          </button>
        </div>
      </div>
    );
  }

  if (access === "guest") {
    return (
      <Link href="/connexion" prefetch={false} className={primaryButton}>
        {t("signInToJoin")}
        <ArrowRight aria-hidden />
      </Link>
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
