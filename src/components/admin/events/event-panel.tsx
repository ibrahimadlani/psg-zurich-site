"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EventForm, emptyEvent, type EventFormValues, type MatchOption } from "@/components/admin/event-form";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";
import { adminButton } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";

/**
 * The event form in its panel: a new event (empty, duplicated from another, or pre-linked to a
 * match) opens once saved; an edited one stays where it is.
 */
export function EventPanel({
  open,
  onOpenChange,
  eventId,
  defaults = emptyEvent,
  matchOptions,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string;
  defaults?: EventFormValues;
  matchOptions: MatchOption[];
  title?: string;
}) {
  const t = useTranslations("AdminEvents");
  const router = useRouter();
  return (
    <ResponsivePanel open={open} onOpenChange={onOpenChange} title={title ?? (eventId ? t("editTitle") : t("new"))}>
      {/* Remounted on each opening: the form starts from the given values. */}
      {open ? (
        <EventForm
          eventId={eventId}
          defaults={defaults}
          matchOptions={matchOptions}
          onDone={(id) => {
            onOpenChange(false);
            if (!eventId && id) router.push(`/admin/evenements/${id}`);
          }}
        />
      ) : null}
    </ResponsivePanel>
  );
}

/** "New event", in the page header; `?nouveau=1` (dashboard shortcut) opens it straight away. */
export function NewEventButton({ matchOptions }: { matchOptions: MatchOption[] }) {
  const t = useTranslations("AdminEvents");
  const params = useSearchParams();
  const [open, setOpen] = useState(() => params.get("nouveau") === "1");
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={adminButton("primary")}>
        <Plus aria-hidden />
        {t("new")}
      </button>
      <EventPanel open={open} onOpenChange={setOpen} matchOptions={matchOptions} />
    </>
  );
}
