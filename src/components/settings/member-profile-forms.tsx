"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BirthDateInput, isoFromParts, partsFromIso } from "@/components/onboarding/birth-date-input";
import { ChoiceCards, ChoiceChips } from "@/components/onboarding/choice-controls";
import { Button } from "@/components/ui/button";
import { MEMBER_INTERESTS, PSG_TICKETING, type MemberInterest } from "@/db/schema";
import { useRouter } from "@/i18n/navigation";
import { isJunior } from "@/lib/dues";

type Ticketing = (typeof PSG_TICKETING)[number];

/** PATCH of member settings with the usual toasts; resolves to whether it worked. */
function useSave() {
  const t = useTranslations("Settings.profile.memberProfile");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const save = (body: object, onDone?: () => void) =>
    startTransition(async () => {
      const response = await fetch("/api/v1/me/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) return void toast.error(t("error"));
      toast.success(t("saved"));
      onDone?.();
      router.refresh();
    });
  return { save, pending };
}

export function BirthDateForm({ initial }: { initial: string | null }) {
  const t = useTranslations("Settings.profile.memberProfile");
  const tOnboarding = useTranslations("Onboarding.birth");
  const { save, pending } = useSave();
  const [date, setDate] = useState(partsFromIso(initial));
  const [saved, setSaved] = useState(initial ?? "");
  const iso = isoFromParts(date);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (iso === null) return void toast.error(tOnboarding("invalid"));
        save({ birthDate: iso }, () => setSaved(iso));
      }}
    >
      <BirthDateInput
        id="settings-birth"
        value={date}
        onChange={setDate}
        labels={{ day: tOnboarding("day"), month: tOnboarding("month"), year: tOnboarding("year") }}
        invalid={iso === null && date.year.length === 4}
      />
      <Button type="submit" disabled={pending || iso === saved}>
        {t("save")}
      </Button>
      {isJunior(iso) ? <p className="w-full text-sm text-muted-foreground">{t("junior")}</p> : null}
    </form>
  );
}

export function InterestsForm({ initial }: { initial: MemberInterest[] }) {
  const t = useTranslations("Settings.profile.memberProfile");
  const tProfile = useTranslations("MemberProfile");
  const { save } = useSave();
  const [value, setValue] = useState(initial);
  return (
    <ChoiceChips
      label={t("interests")}
      options={MEMBER_INTERESTS.map((item) => ({ value: item, label: tProfile(`interests.${item}`) }))}
      value={value}
      onChange={(next) => {
        setValue(next);
        save({ interests: next });
      }}
    />
  );
}

export function TicketingForm({ initial }: { initial: Ticketing | null }) {
  const t = useTranslations("Settings.profile.memberProfile");
  const tProfile = useTranslations("MemberProfile");
  const { save } = useSave();
  const [value, setValue] = useState(initial);
  return (
    <ChoiceCards
      label={t("ticketing")}
      options={PSG_TICKETING.map((item) => ({
        value: item,
        label: tProfile(`ticketing.${item}.label`),
        description: tProfile(`ticketing.${item}.hint`),
      }))}
      value={value}
      onChange={(next) => {
        if (next === value) return;
        setValue(next);
        save({ psgTicketing: next });
      }}
    />
  );
}

export function PhotoConsentForm({ initial }: { initial: boolean | null }) {
  const t = useTranslations("Settings.profile.memberProfile");
  const tOnboarding = useTranslations("Onboarding.photos");
  const { save } = useSave();
  const [value, setValue] = useState<"yes" | "no" | null>(initial === null ? null : initial ? "yes" : "no");
  return (
    <ChoiceCards
      label={t("photos")}
      options={[
        { value: "yes", label: tOnboarding("yes"), description: tOnboarding("yesHint") },
        { value: "no", label: tOnboarding("no"), description: tOnboarding("noHint") },
      ]}
      value={value}
      onChange={(next) => {
        if (next === value) return;
        setValue(next);
        save({ photoConsent: next === "yes" });
      }}
    />
  );
}
