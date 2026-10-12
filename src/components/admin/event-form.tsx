"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EVENT_TYPES } from "@/db/schema";
import { useRouter } from "@/i18n/navigation";

const schema = z
  .object({
    type: z.enum(EVENT_TYPES),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(10_000),
    matchId: z.string(),
    location: z.string().trim().max(255),
    startsAt: z.string().min(1),
    endsAt: z.string(),
    capacity: z.string().regex(/^\d*$/),
    membersOnly: z.boolean(),
  })
  .refine((v) => !v.endsAt || v.endsAt >= v.startsAt, { path: ["endsAt"] });
export type EventFormValues = z.infer<typeof schema>;

export const emptyEvent: EventFormValues = {
  type: "watch_party",
  title: "",
  description: "",
  matchId: "",
  location: "",
  startsAt: "",
  endsAt: "",
  capacity: "",
  membersOnly: false,
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Create (no `eventId`) or edit an event. Dates are datetime-local values, read in the admin's time zone. */
export function EventForm({
  eventId,
  defaults = emptyEvent,
  matchOptions,
  onDone,
}: {
  eventId?: string;
  defaults?: EventFormValues;
  matchOptions: { id: string; label: string }[];
  onDone?: () => void;
}) {
  const t = useTranslations("AdminEvents");
  const tEvents = useTranslations("Events");
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  async function onSubmit(values: EventFormValues) {
    setFailed(false);
    const response = await fetch(eventId ? `/api/v1/events/${eventId}` : "/api/v1/events", {
      method: eventId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: values.type,
        title: values.title,
        description: values.description || undefined,
        matchId: values.matchId || undefined,
        location: values.location || undefined,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
        capacity: values.capacity ? Number(values.capacity) : undefined,
        membersOnly: values.membersOnly,
      }),
    });
    if (!response.ok) {
      setFailed(true);
      return;
    }
    if (!eventId) reset(emptyEvent);
    onDone?.();
    router.refresh();
  }

  const field = (name: keyof EventFormValues, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`event-${eventId ?? "new"}-${name}`}>{label}</Label>
      <Input id={`event-${eventId ?? "new"}-${name}`} aria-invalid={errors[name] ? true : undefined} {...props} {...register(name)} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor={`event-${eventId ?? "new"}-type`}>{t("type")}</Label>
          <select id={`event-${eventId ?? "new"}-type`} className={selectClass} {...register("type")}>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {tEvents(`types.${type}`)}
              </option>
            ))}
          </select>
        </div>
        {field("title", t("title"), { maxLength: 200, placeholder: t("titlePlaceholder") })}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`event-${eventId ?? "new"}-match`}>{t("match")}</Label>
        <select id={`event-${eventId ?? "new"}-match`} className={selectClass} {...register("matchId")}>
          <option value="">{t("noMatch")}</option>
          {matchOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`event-${eventId ?? "new"}-description`}>{t("description")}</Label>
        <textarea
          id={`event-${eventId ?? "new"}-description`}
          rows={3}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...register("description")}
        />
      </div>
      {field("location", t("location"), { maxLength: 255, placeholder: t("locationPlaceholder") })}
      <div className="grid gap-4 sm:grid-cols-3">
        {field("startsAt", t("startsAt"), { type: "datetime-local" })}
        {field("endsAt", t("endsAt"), { type: "datetime-local" })}
        {field("capacity", t("capacity"), { inputMode: "numeric", placeholder: t("unlimited") })}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-primary" {...register("membersOnly")} />
        {t("membersOnly")}
      </label>
      {failed || Object.keys(errors).length > 0 ? (
        <p role="alert" className="text-sm text-destructive">
          {failed ? t("error") : t("invalid")}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : eventId ? t("save") : t("create")}
      </Button>
    </form>
  );
}
