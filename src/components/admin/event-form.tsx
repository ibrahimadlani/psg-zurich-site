"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/maps/address-autocomplete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EVENT_TYPES } from "@/db/schema";
import { useRouter } from "@/i18n/navigation";
import { mapsEnabled } from "@/lib/google-maps";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    type: z.enum(EVENT_TYPES),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(10_000),
    matchId: z.string(),
    location: z.string().trim().max(255),
    address: z.string().trim().max(255),
    // Set when an address suggestion is picked; cleared when the address is typed by hand.
    placeId: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    startsAt: z.string().min(1),
    endsAt: z.string(),
    capacity: z.string().regex(/^\d*$/),
    notifyMembers: z.boolean(),
  })
  .refine((v) => !v.endsAt || v.endsAt >= v.startsAt, { path: ["endsAt"] })
  // Every event gets its pin on the map: the address must come from the suggestions.
  .refine((v) => !mapsEnabled || (v.latitude !== null && v.longitude !== null), { path: ["address"] });
export type EventFormValues = z.infer<typeof schema>;

export const emptyEvent: EventFormValues = {
  type: "watch_party",
  title: "",
  description: "",
  matchId: "",
  location: "",
  address: "",
  placeId: "",
  latitude: null,
  longitude: null,
  startsAt: "",
  endsAt: "",
  capacity: "",
  notifyMembers: true,
};

/** Same look as <Input> for the address field (a plain input with suggestions). */
const inputClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

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
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const [address, latitude] = useWatch({ control, name: ["address", "latitude"] });

  async function onSubmit(values: EventFormValues) {
    const response = await fetch(eventId ? `/api/v1/events/${eventId}` : "/api/v1/events", {
      method: eventId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: values.type,
        title: values.title,
        description: values.description || undefined,
        matchId: values.matchId || undefined,
        location: values.location || undefined,
        address: values.address || undefined,
        placeId: values.placeId || undefined,
        latitude: values.latitude ?? undefined,
        longitude: values.longitude ?? undefined,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
        capacity: values.capacity ? Number(values.capacity) : undefined,
        notifyMembers: !eventId && values.notifyMembers,
      }),
    });
    if (!response.ok) {
      toast.error(t("error"));
      return;
    }
    toast.success(t(eventId ? "updated" : "created"));
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
    <form onSubmit={handleSubmit(onSubmit, () => toast.error(t("invalid")))} noValidate className="space-y-4">
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
      <div className="grid gap-4 sm:grid-cols-2">
        {field("location", t("location"), { maxLength: 255, placeholder: t("locationPlaceholder") })}
        <div className="space-y-1.5">
          <Label htmlFor={`event-${eventId ?? "new"}-address`}>{t("address")}</Label>
          <AddressAutocomplete
            id={`event-${eventId ?? "new"}-address`}
            className={inputClass}
            maxLength={255}
            placeholder={t("addressPlaceholder")}
            aria-invalid={errors.address ? true : undefined}
            value={address}
            onChange={(value) => {
              setValue("address", value, { shouldDirty: true });
              setValue("placeId", "");
              setValue("latitude", null);
              setValue("longitude", null);
            }}
            onPick={(place) => {
              setValue("placeId", place.placeId);
              setValue("latitude", place.latitude);
              setValue("longitude", place.longitude, { shouldValidate: Boolean(errors.address) });
            }}
          />
          <p className={cn("text-xs", errors.address ? "text-destructive" : "text-muted-foreground")}>
            {errors.address ? t("addressRequired") : latitude !== null ? t("addressLocated") : t("addressHint")}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {field("startsAt", t("startsAt"), { type: "datetime-local" })}
        {field("endsAt", t("endsAt"), { type: "datetime-local" })}
        {field("capacity", t("capacity"), { inputMode: "numeric", placeholder: t("unlimited") })}
      </div>
      {eventId ? null : (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" {...register("notifyMembers")} />
          {t("notifyMembers")}
        </label>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : eventId ? t("save") : t("create")}
      </Button>
    </form>
  );
}
