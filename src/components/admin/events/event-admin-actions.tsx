"use client";

import { Copy, Download, ExternalLink, Pencil, ScanLine, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { EventFormValues, MatchOption } from "@/components/admin/event-form";
import { EventPanel } from "@/components/admin/events/event-panel";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { adminButton } from "@/components/admin/ui/styles";
import { NewCampaignButton } from "@/components/mailing/mailing-actions";
import { Link, useRouter } from "@/i18n/navigation";

/**
 * What to do with an event: edit it, copy it for the next time (same place and type, new date),
 * open it on the site or at the door, take the list away, delete it.
 */
export function EventAdminActions({
  eventId,
  title,
  form,
  matchOptions,
  emails,
  upcoming,
  canMail,
}: {
  eventId: string;
  title: string;
  form: EventFormValues;
  matchOptions: MatchOption[];
  /** Addresses of the members with a place (for a quick email in BCC). */
  emails: string[];
  upcoming: boolean;
  /** Admins: a mailing campaign to those signed up. */
  canMail: boolean;
}) {
  const t = useTranslations("AdminEvents");
  const router = useRouter();
  const ask = useConfirm();
  const [panel, setPanel] = useState<"edit" | "duplicate" | null>(null);
  const [pending, startTransition] = useTransition();

  // A copy keeps what repeats (type, place, capacity, text), not the date nor the match.
  const copy: EventFormValues = { ...form, matchId: "", startsAt: "", endsAt: "", notifyMembers: true };

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setPanel("edit")} className={adminButton("primary")}>
        <Pencil aria-hidden />
        {t("edit")}
      </button>
      {upcoming ? (
        <Link href={`/admin/scanner?evenement=${eventId}`} prefetch={false} className={adminButton("secondary")}>
          <ScanLine aria-hidden />
          {t("openScanner")}
        </Link>
      ) : null}
      <button type="button" onClick={() => setPanel("duplicate")} className={adminButton("secondary")}>
        <Copy aria-hidden />
        {t("duplicate")}
      </button>
      <a href={`/api/v1/events/${eventId}/attendees/export`} className={adminButton("secondary")}>
        <Download aria-hidden />
        {t("export")}
      </a>
      {canMail && emails.length ? (
        <NewCampaignButton audience="event" eventId={eventId} defaultName={title} label={t("writeAttendees")} className={adminButton("secondary")} />
      ) : null}
      {emails.length ? (
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(emails.join(", "));
              toast.success(t("emailsCopied", { count: emails.length }));
            } catch {
              toast.error(t("emailsCopyFailed"));
            }
          }}
          className={adminButton("secondary")}
          title={t("copyEmailsHint")}
        >
          <Users aria-hidden />
          {t("copyEmails")}
        </button>
      ) : null}
      <Link href={`/evenements/${eventId}`} prefetch={false} className={adminButton("ghost")}>
        <ExternalLink aria-hidden />
        {t("viewOnSite")}
      </Link>
      <button
        type="button"
        disabled={pending}
        className={adminButton("ghost", "md", "text-destructive hover:text-destructive")}
        onClick={async () => {
          const answer = await ask({ title: t("deleteTitle"), body: t(upcoming ? "deleteBodyUpcoming" : "deleteBody"), confirmLabel: t("delete"), tone: "danger", typeToConfirm: upcoming ? title : undefined });
          if (answer === null) return;
          startTransition(async () => {
            const response = await fetch(`/api/v1/events/${eventId}`, { method: "DELETE" });
            if (!response.ok) {
              toast.error(t("deleteError"));
              return;
            }
            toast.success(t("deleted"));
            router.push("/admin/evenements");
            router.refresh();
          });
        }}
      >
        <Trash2 aria-hidden />
        {t("delete")}
      </button>

      <EventPanel open={panel === "edit"} onOpenChange={(open) => setPanel(open ? "edit" : null)} eventId={eventId} defaults={form} matchOptions={matchOptions} />
      <EventPanel
        open={panel === "duplicate"}
        onOpenChange={(open) => setPanel(open ? "duplicate" : null)}
        defaults={copy}
        matchOptions={matchOptions}
        title={t("duplicateTitle")}
      />
    </div>
  );
}
