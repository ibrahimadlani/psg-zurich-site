"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { adminButton, adminInput, adminLabel } from "@/components/admin/ui/styles";
import { AddressAutocomplete } from "@/components/maps/address-autocomplete";
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

export type MatchOption = { id: string; label: string; title: string; kickoff: string };

const labelClass = "text-[13px] font-medium";

/**
 * Create (no `eventId`) or edit an event, in sections: what, when, where, places. Dates are
 * datetime-local values, read in the admin's time zone. The save button stays at the bottom of
 * the panel it opens in.
 */
export function EventForm({
  eventId,
  defaults = emptyEvent,
  matchOptions,
  onDone,
}: {
  eventId?: string;
  defaults?: EventFormValues;
  matchOptions: MatchOption[];
  /** After saving, with the event's id (to open it). */
  onDone?: (id: string) => void;
}) {
  const t = useTranslations("AdminEvents");
  const tEvents = useTranslations("Events");
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const [address, latitude] = useWatch({ control, name: ["address", "latitude"] });
  const prefix = `event-${eventId ?? "new"}`;

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
    const body = (await response.json().catch(() => null)) as { data?: { id: string } } | null;
    toast.success(t(eventId ? "updated" : "created"));
    onDone?.(body?.data?.id ?? eventId ?? "");
    router.refresh();
  }

  const field = (name: keyof EventFormValues, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="space-y-1.5">
      <label htmlFor={`${prefix}-${name}`} className={labelClass}>
        {label}
      </label>
      <input id={`${prefix}-${name}`} aria-invalid={errors[name] ? true : undefined} className={adminInput} {...props} {...register(name)} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error(t("invalid")))} noValidate className="space-y-7">
      <fieldset className="space-y-4">
        <legend className={cn(adminLabel, "mb-3")}>{t("sections.what")}</legend>
        <div className="space-y-1.5">
          <span className={labelClass}>{t("type")}</span>
          {/* The type as chips: one tap, all visible. */}
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPES.map((type) => (
              <label key={type} className="cursor-pointer">
                <input type="radio" value={type} className="peer sr-only" {...register("type")} />
                <span className="inline-flex h-9 items-center rounded-full border bg-card px-3.5 text-[13px] text-muted-foreground transition-colors peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 lg:h-8">
                  {tEvents(`types.${type}`)}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${prefix}-match`} className={labelClass}>
            {t("match")}
          </label>
          <select
            id={`${prefix}-match`}
            className={adminInput}
            {...register("matchId", {
              // Picking a match fills an empty title ("Watch party PSG – Lens") and start.
              onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                const option = matchOptions.find((item) => item.id === event.target.value);
                if (!option) return;
                if (!getValues("title")) setValue("title", `${tEvents(`types.${getValues("type")}`)} ${option.title}`);
                if (!getValues("startsAt")) setValue("startsAt", option.kickoff);
              },
            })}
          >
            <option value="">{t("noMatch")}</option>
            {matchOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {field("title", t("title"), { maxLength: 200, placeholder: t("titlePlaceholder") })}
        <div className="space-y-1.5">
          <label htmlFor={`${prefix}-description`} className={labelClass}>
            {t("description")}
          </label>
          <textarea id={`${prefix}-description`} rows={4} className={cn(adminInput, "h-auto py-2 lg:h-auto")} {...register("description")} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={cn(adminLabel, "mb-3")}>{t("sections.when")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("startsAt", t("startsAt"), { type: "datetime-local" })}
          {field("endsAt", t("endsAt"), { type: "datetime-local" })}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={cn(adminLabel, "mb-3")}>{t("sections.where")}</legend>
        {field("location", t("location"), { maxLength: 255, placeholder: t("locationPlaceholder") })}
        <div className="space-y-1.5">
          <label htmlFor={`${prefix}-address`} className={labelClass}>
            {t("address")}
          </label>
          <AddressAutocomplete
            id={`${prefix}-address`}
            className={adminInput}
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
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={cn(adminLabel, "mb-3")}>{t("sections.places")}</legend>
        <div className="max-w-48">{field("capacity", t("capacity"), { inputMode: "numeric", placeholder: t("unlimited") })}</div>
        {eventId ? null : (
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-0.5 size-[18px] accent-psg-blue" {...register("notifyMembers")} />
            {t("notifyMembers")}
          </label>
        )}
      </fieldset>

      {/* Pinned at the bottom of the panel (its padding included). */}
      <div className="sticky -bottom-5 -mx-5 -mb-5 border-t bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="submit" disabled={isSubmitting} className={adminButton("primary", "md", "w-full")}>
          {isSubmitting ? t("saving") : eventId ? t("save") : t("create")}
        </button>
      </div>
    </form>
  );
}
