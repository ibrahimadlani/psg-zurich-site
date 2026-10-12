"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

type Props = {
  eventId: string;
  /** null: not signed up (or cancelled). */
  status: "registered" | "waitlisted" | "cancelled" | "attended" | null;
  full: boolean;
  /** "guest": not signed in; "inactive": membership not accepted yet. */
  access: "member" | "guest" | "inactive";
};

/** Sign up / waitlist / cancel for an event. */
export function EventSignup({ eventId, status, full, access }: Props) {
  const t = useTranslations("Events");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  if (access === "guest") {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href="/connexion" prefetch={false}>
          {t("signInToJoin")}
        </Link>
      </Button>
    );
  }
  if (access === "inactive") return <p className="text-xs text-muted-foreground">{t("membersOnlySignup")}</p>;

  const send = (method: "POST" | "DELETE") =>
    startTransition(async () => {
      setFailed(false);
      const response = await fetch(`/api/v1/events/${eventId}/attendance`, { method });
      if (!response.ok) setFailed(true);
      router.refresh();
    });

  const active = status === "registered" || status === "waitlisted";
  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      {active ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{t(status === "registered" ? "registered" : "waitlisted")}</span>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => send("DELETE")}>
            {t("cancel")}
          </Button>
        </div>
      ) : (
        <Button size="sm" disabled={pending} onClick={() => send("POST")}>
          {full ? t("joinWaitlist") : t("signUp")}
        </Button>
      )}
      {failed ? <span className="text-xs text-destructive">{t("error")}</span> : null}
    </div>
  );
}
