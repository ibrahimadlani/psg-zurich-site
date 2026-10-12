"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { EventForm, type EventFormValues } from "@/components/admin/event-form";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

/** Edit / delete buttons of an event, with the edit form unfolding below. */
export function EventAdminActions({
  eventId,
  defaults,
  matchOptions,
}: {
  eventId: string;
  defaults: EventFormValues;
  matchOptions: { id: string; label: string }[];
}) {
  const t = useTranslations("AdminEvents");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="w-full space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing((value) => !value)}>
          {editing ? t("close") : t("edit")}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (!confirm(t("confirmDelete"))) return;
            startTransition(async () => {
              await fetch(`/api/v1/events/${eventId}`, { method: "DELETE" });
              router.refresh();
            });
          }}
        >
          {t("delete")}
        </Button>
      </div>
      {editing ? (
        <div className="rounded-lg border p-3">
          <EventForm eventId={eventId} defaults={defaults} matchOptions={matchOptions} onDone={() => setEditing(false)} />
        </div>
      ) : null}
    </div>
  );
}

/** "Sync matches now" (football-data.org). */
export function MatchSyncButton() {
  const t = useTranslations("AdminEvents");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            const response = await fetch("/api/v1/matches/sync", { method: "POST" });
            const body = (await response.json().catch(() => null)) as {
              data?: { fixtures: number };
              error?: { code: string; message: string };
            } | null;
            setResult(
              response.ok
                ? t("synced", { count: body?.data?.fixtures ?? 0 })
                : body?.error?.code === "not_configured"
                  ? t("syncNotConfigured")
                  : t("syncFailed", { message: body?.error?.message ?? "" }),
            );
            router.refresh();
          })
        }
      >
        {pending ? t("syncing") : t("sync")}
      </Button>
      {result ? <span className="text-sm text-muted-foreground">{result}</span> : null}
    </div>
  );
}
