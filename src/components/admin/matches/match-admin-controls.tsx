"use client";

import { CalendarPlus, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { emptyEvent, type MatchOption } from "@/components/admin/event-form";
import { EventPanel } from "@/components/admin/events/event-panel";
import { MatchForm, type MatchFormValues } from "@/components/admin/match-form";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";
import { adminButton } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";

/** "Sync now" with football-data.org (the cron does it too). */
export function MatchSyncButton() {
  const t = useTranslations("AdminEvents");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={adminButton("secondary")}
      onClick={() =>
        startTransition(async () => {
          const response = await fetch("/api/v1/matches/sync", { method: "POST" });
          const body = (await response.json().catch(() => null)) as { data?: { fixtures: number }; error?: { code: string; message: string } } | null;
          if (response.ok) notify.success(t("synced", { count: body?.data?.fixtures ?? 0 }));
          else notify.error(body?.error?.code === "not_configured" ? t("syncNotConfigured") : t("syncFailed", { message: body?.error?.message ?? "" }));
          router.refresh();
        })
      }
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden />
      {pending ? t("syncing") : t("sync")}
    </button>
  );
}

/** A match football-data.org doesn't cover (cup, friendly…), entered by hand. */
export function NewMatchButton() {
  const t = useTranslations("AdminMatches");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={adminButton("primary")}>
        <Plus aria-hidden />
        {t("newShort")}
      </button>
      <ResponsivePanel open={open} onOpenChange={setOpen} title={t("newShort")} description={t("newHint")}>
        {open ? <MatchForm onDone={() => setOpen(false)} /> : null}
      </ResponsivePanel>
    </>
  );
}

/** On a match row: plan an event for it; edit or delete a match entered by hand. */
export function MatchRowActions({
  option,
  manual,
  matchId,
  defaults,
}: {
  option: MatchOption | null;
  manual: boolean;
  matchId: string;
  defaults: MatchFormValues | null;
}) {
  const t = useTranslations("AdminMatches");
  const tEvents = useTranslations("Events");
  const router = useRouter();
  const ask = useConfirm();
  const [panel, setPanel] = useState<"event" | "edit" | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-1.5">
      {option ? (
        <button type="button" onClick={() => setPanel("event")} className={adminButton("secondary", "sm")}>
          <CalendarPlus aria-hidden />
          {t("planEvent")}
        </button>
      ) : null}
      {manual && defaults ? (
        <>
          <button type="button" onClick={() => setPanel("edit")} className={adminButton("ghost", "sm")}>
            <Pencil aria-hidden />
            <span className="max-sm:sr-only">{t("edit")}</span>
          </button>
          <button
            type="button"
            disabled={pending}
            className={adminButton("ghost", "sm", "text-destructive hover:text-destructive")}
            onClick={async () => {
              if ((await ask({ title: t("deleteTitle"), body: t("confirmDelete"), confirmLabel: t("delete"), tone: "danger" })) === null) return;
              startTransition(async () => {
                const response = await fetch(`/api/v1/matches/${matchId}`, { method: "DELETE" });
                if (response.ok) notify.success(t("deleted"));
                else notify.error(t("deleteError"));
                router.refresh();
              });
            }}
          >
            <Trash2 aria-hidden />
            <span className="max-sm:sr-only">{t("delete")}</span>
          </button>
          <ResponsivePanel open={panel === "edit"} onOpenChange={(open) => setPanel(open ? "edit" : null)} title={t("edit")}>
            {panel === "edit" ? <MatchForm matchId={matchId} defaults={defaults} onDone={() => setPanel(null)} /> : null}
          </ResponsivePanel>
        </>
      ) : null}
      {option ? (
        <EventPanel
          open={panel === "event"}
          onOpenChange={(open) => setPanel(open ? "event" : null)}
          matchOptions={[option]}
          title={t("planEvent")}
          defaults={{ ...emptyEvent, matchId: option.id, title: `${tEvents("types.watch_party")} ${option.title}`, startsAt: option.kickoff }}
        />
      ) : null}
    </div>
  );
}
