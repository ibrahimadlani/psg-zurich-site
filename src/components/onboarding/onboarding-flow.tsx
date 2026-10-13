"use client";

import { ArrowLeft } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FieldError, inputClass, labelClass, submitClass } from "@/components/auth/auth-ui";
import { AddressAutocomplete } from "@/components/maps/address-autocomplete";
import { BirthDateInput, isoFromParts, partsFromIso, type DateParts } from "@/components/onboarding/birth-date-input";
import { ChoiceCards, ChoiceChips } from "@/components/onboarding/choice-controls";
import { StepShell } from "@/components/onboarding/step-shell";
import { PhoneInput } from "@/components/ui/phone-input";
import { MEMBER_INTERESTS, PSG_TICKETING, type MemberInterest } from "@/db/schema";
import { useRouter } from "@/i18n/navigation";
import { isJunior } from "@/lib/dues";
import { MEMBER_ADDRESS_REGIONS, type PickedAddress } from "@/lib/google-maps";
import { normalizePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Ticketing = (typeof PSG_TICKETING)[number];
export type OnboardingInitial = {
  phone: string | null;
  address: string | null;
  birthDate: string | null;
  interests: MemberInterest[] | null;
  psgTicketing: Ticketing | null;
  photoConsent: boolean | null;
};

/** 0 welcome, 1–5 questions, 6 recap. */
const QUESTIONS = 5;
const RECAP = 6;

/**
 * Welcome flow after the email is confirmed: one question per screen, all optional, each
 * saved as soon as the member moves on (closing the tab loses nothing). "Later" ends it at
 * any point; everything stays editable in the settings.
 */
export function OnboardingFlow({
  firstName,
  pending,
  next,
  initial,
  startAt = 0,
}: {
  firstName: string;
  pending: boolean;
  next: string;
  initial: OnboardingInitial;
  startAt?: number;
}) {
  const t = useTranslations("Onboarding");
  const tProfile = useTranslations("MemberProfile");
  const tMembership = useTranslations("Membership");
  const format = useFormatter();
  const router = useRouter();

  const [step, setStep] = useState(startAt);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  // Set when a step is opened from the recap: "Next" then goes straight back to it.
  const [fromRecap, setFromRecap] = useState(false);
  const [busy, startTransition] = useTransition();

  const [phone, setPhone] = useState(initial.phone ?? "");
  const [addressText, setAddressText] = useState(initial.address ?? "");
  const [picked, setPicked] = useState<PickedAddress | null>(null);
  const [date, setDate] = useState<DateParts>(partsFromIso(initial.birthDate));
  const [interests, setInterests] = useState<MemberInterest[]>(initial.interests ?? []);
  const [ticketing, setTicketing] = useState<Ticketing | null>(initial.psgTicketing);
  const [photo, setPhoto] = useState<"yes" | "no" | null>(
    initial.photoConsent === null ? null : initial.photoConsent ? "yes" : "no",
  );
  const [checked, setChecked] = useState(false);

  const birthIso = isoFromParts(date);
  const phoneInvalid = phone !== "" && normalizePhone(phone) === null;
  const stepInvalid = (step === 1 && phoneInvalid) || (step === 2 && birthIso === null);
  const answered =
    (step === 1 && (phone !== "" || addressText.trim() !== "")) ||
    (step === 2 && birthIso !== "") ||
    (step === 3 && interests.length > 0) ||
    (step === 4 && ticketing !== null) ||
    (step === 5 && photo !== null);

  // Saves run one after another, so "Finish" never overtakes a step still being saved.
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const save = (body: object) => {
    queue.current = queue.current.then(async () => {
      const response = await fetch("/api/v1/me/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => null);
      return Boolean(response?.ok);
    });
    return queue.current;
  };

  /** What the current step has to save. */
  const stepPayload = (): object => {
    switch (step) {
      case 1: {
        // The saved address comes back as one line: only send it again if it was changed.
        const address = picked
          ? { address: picked.street, postcode: picked.postcode, city: picked.city }
          : addressText.trim() === (initial.address ?? "")
            ? {}
            : { address: addressText.trim() };
        return { phone, ...address };
      }
      case 2:
        return birthIso === null ? {} : { birthDate: birthIso };
      case 3:
        return { interests };
      case 4:
        return ticketing ? { psgTicketing: ticketing } : {};
      case 5:
        return photo ? { photoConsent: photo === "yes" } : {};
      default:
        return {};
    }
  };

  const go = (to: number) => {
    setDirection(to > step ? "forward" : "back");
    setChecked(false);
    setStep(to);
  };

  const forward = () => {
    if (stepInvalid) {
      setChecked(true);
      return;
    }
    if (step >= 1 && step <= QUESTIONS) {
      void save(stepPayload()).then((ok) => {
        if (!ok) toast.error(t("error"));
      });
    }
    if (fromRecap) {
      setFromRecap(false);
      go(RECAP);
    } else go(step + 1);
  };

  const end = () =>
    startTransition(async () => {
      const ok = await save({ ...(stepInvalid ? {} : stepPayload()), done: true });
      if (!ok) return void toast.error(t("error"));
      if (step === RECAP) toast.success(t("saved"));
      router.replace(next);
      router.refresh();
    });

  // Focus follows the step: the first field on a computer (no keyboard popping up on
  // phones), else the step title for screen readers.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    const field = { 1: "onboarding-phone", 2: "onboarding-birth-day" }[step];
    const target = field && window.matchMedia("(pointer: fine)").matches ? document.getElementById(field) : titleRef.current;
    target?.focus({ preventScroll: true });
  }, [step]);

  const heading = (title: string, why?: string) => (
    <div className="flex flex-col gap-1.5">
      <h2 ref={titleRef} tabIndex={-1} className="font-narrow text-[30px] leading-[0.95] font-extrabold uppercase italic outline-none">
        {title}
      </h2>
      {why ? <p className="text-[14px] leading-normal text-pretty text-muted-foreground">{why}</p> : null}
    </div>
  );

  const interestOptions = MEMBER_INTERESTS.map((value) => ({ value, label: tProfile(`interests.${value}`) }));
  const ticketingOptions = PSG_TICKETING.map((value) => ({
    value,
    label: tProfile(`ticketing.${value}.label`),
    description: tProfile(`ticketing.${value}.hint`),
  }));

  const recapRows: { step: number; label: string; value: string | null }[] = [
    { step: 1, label: tMembership("phone"), value: phone && !phoneInvalid ? phone : null },
    { step: 1, label: tMembership("address"), value: addressText.trim() || null },
    {
      step: 2,
      label: t("recap.birthDate"),
      value: birthIso ? format.dateTime(new Date(`${birthIso}T12:00:00Z`), { day: "numeric", month: "long", year: "numeric" }) : null,
    },
    { step: 3, label: t("recap.interests"), value: interests.length ? interests.map((value) => tProfile(`interests.${value}`)).join(", ") : null },
    { step: 4, label: t("recap.ticketing"), value: ticketing ? tProfile(`ticketing.${ticketing}.label`) : null },
    { step: 5, label: t("recap.photos"), value: photo ? t(photo === "yes" ? "recap.photosYes" : "recap.photosNo") : null },
  ];

  const screens: Record<number, React.ReactNode> = {
    0: (
      <div className="flex flex-col gap-3 pt-[min(12vh,96px)] text-center">
        <h1 className="font-narrow text-[length:clamp(36px,8vw,48px)] leading-[0.95] font-extrabold uppercase italic">
          {t("welcome.title", { name: firstName })}
        </h1>
        <p className="text-[15px] leading-normal text-pretty text-muted-foreground">
          {pending ? t("welcome.bodyPending") : t("welcome.body")}
        </p>
        <p className={cn(labelClass, "mt-2")}>{t("welcome.duration")}</p>
      </div>
    ),
    1: (
      <div className="flex flex-col gap-5">
        {heading(t("contact.title"), t("contact.why"))}
        <div className="flex min-w-0 flex-col gap-[7px]">
          <label htmlFor="onboarding-phone" className={labelClass}>
            {tMembership("phone")}
          </label>
          <PhoneInput
            id="onboarding-phone"
            value={phone}
            onChange={setPhone}
            invalid={checked && phoneInvalid}
            describedBy="onboarding-phone-error"
            countryLabel={tMembership("phoneCountry")}
            className="h-11 rounded-[8px] border bg-card [transition:border-color_.2s,box-shadow_.2s]"
          />
          <FieldError id="onboarding-phone-error">{checked && phoneInvalid ? tMembership("invalidPhone") : null}</FieldError>
        </div>
        <div className="flex min-w-0 flex-col gap-[7px]">
          <label htmlFor="onboarding-address" className={labelClass}>
            {tMembership("address")}
          </label>
          <AddressAutocomplete
            id="onboarding-address"
            className={cn(inputClass, "h-11 px-3 text-[16px] sm:text-[14px]")}
            maxLength={255}
            placeholder={t("contact.addressPlaceholder")}
            regions={MEMBER_ADDRESS_REGIONS}
            value={addressText}
            onChange={(value) => {
              setAddressText(value);
              setPicked(null);
            }}
            onPick={setPicked}
          />
        </div>
      </div>
    ),
    2: (
      <div className="flex flex-col gap-5">
        {heading(t("birth.title"), t("birth.why"))}
        <div className="flex flex-col gap-2">
          <BirthDateInput
            id="onboarding-birth"
            value={date}
            onChange={setDate}
            labels={{ day: t("birth.day"), month: t("birth.month"), year: t("birth.year") }}
            invalid={checked && birthIso === null}
            describedBy="onboarding-birth-error"
          />
          <FieldError id="onboarding-birth-error">{checked && birthIso === null ? t("birth.invalid") : null}</FieldError>
        </div>
        {/* Junior note: unfolds once the date says under 18. */}
        <div
          data-shown={isJunior(birthIso) || undefined}
          className="-mt-5 grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity,margin] duration-300 ease-out data-[shown]:mt-0 data-[shown]:grid-rows-[1fr] data-[shown]:opacity-100 motion-reduce:transition-none"
        >
          <p className="min-h-0 overflow-hidden" aria-live="polite">
            <span className="block rounded-[10px] border bg-card px-4 py-3 text-[14px] leading-normal text-pretty">
              {t.rich("birth.junior", { b: (chunks) => <strong className="font-semibold">{chunks}</strong> })}
            </span>
          </p>
        </div>
      </div>
    ),
    3: (
      <div className="flex flex-col gap-5">
        {heading(t("interests.title"), t("interests.why"))}
        <ChoiceChips options={interestOptions} value={interests} onChange={setInterests} label={t("interests.title")} />
        <p className="text-[12px] text-muted-foreground">{t("interests.hint")}</p>
      </div>
    ),
    4: (
      <div className="flex flex-col gap-5">
        {heading(t("ticketing.title"), t("ticketing.why"))}
        <ChoiceCards options={ticketingOptions} value={ticketing} onChange={setTicketing} label={t("ticketing.title")} />
      </div>
    ),
    5: (
      <div className="flex flex-col gap-5">
        {heading(t("photos.title"), t("photos.why"))}
        <ChoiceCards
          options={[
            { value: "yes", label: t("photos.yes"), description: t("photos.yesHint") },
            { value: "no", label: t("photos.no"), description: t("photos.noHint") },
          ]}
          value={photo}
          onChange={setPhoto}
          label={t("photos.title")}
        />
      </div>
    ),
    6: (
      <div className="flex flex-col gap-5">
        {heading(t("recap.title"), t("recap.body"))}
        <dl className="divide-y rounded-[12px] border bg-card">
          {recapRows.map((row, index) => (
            <div
              key={row.label}
              className="flex animate-page-in items-start gap-3 px-4 py-3"
              style={{ animationDelay: `${80 + index * 40}ms` }}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <dt className={labelClass}>{row.label}</dt>
                <dd className={cn("text-[14px] [overflow-wrap:anywhere]", !row.value && "text-muted-foreground")}>
                  {row.value ?? t("recap.empty")}
                </dd>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFromRecap(true);
                  go(row.step);
                }}
                className="mt-3 cursor-pointer border-b border-transparent text-[13px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                {t("recap.edit")}
              </button>
            </div>
          ))}
        </dl>
      </div>
    ),
  };

  const primary = step === 0 ? t("start") : step === RECAP ? t("finish") : fromRecap ? t("backToRecap") : answered ? t("next") : t("skip");

  return (
    // Fixed minimum height, content from the top: the page (centred) doesn't move between steps.
    <div className="flex min-h-[min(600px,calc(100svh-170px))] w-full max-w-[380px] flex-col gap-6 max-sm:pb-28">
      {/* Back arrow and progress: hidden on the welcome screen. */}
      <div
        className={cn(
          "flex h-8 items-center gap-3 transition-opacity duration-300",
          step === 0 ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-hidden={step === 0}
      >
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step <= 1 || busy}
          aria-label={t("back")}
          className="grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground transition-[color,opacity] hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {Array.from({ length: QUESTIONS }, (_, index) => (
            <span key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
              <span
                className="block h-full origin-left rounded-full bg-segment transition-transform duration-400 ease-out"
                style={{ transform: `scaleX(${Math.min(step, RECAP - 1) > index ? 1 : 0})` }}
              />
            </span>
          ))}
        </div>
        <span className="w-8 text-right text-[12px] text-muted-foreground tabular-nums">
          {Math.min(step, QUESTIONS)}/{QUESTIONS}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {step >= 1 && step <= QUESTIONS ? t("progress", { current: step, total: QUESTIONS }) : null}
      </p>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (step === RECAP) end();
          else forward();
        }}
        className="flex flex-col gap-6"
      >
        <StepShell stepKey={step} direction={direction}>
          {screens[step]}
        </StepShell>

        {/* Actions: under the step on a computer, pinned to the bottom of the screen on a phone. */}
        <div className="flex flex-col gap-3 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-10 max-sm:border-t max-sm:bg-background/90 max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(16px,env(safe-area-inset-bottom))] max-sm:backdrop-blur">
          <button type="submit" disabled={busy} className={cn(submitClass, "mt-0 h-11 w-full")}>
            <span key={primary} className="inline-block animate-page-in">
              {primary}
            </span>
          </button>
          {step === RECAP ? null : (
            <button
              type="button"
              disabled={busy}
              onClick={end}
              className="cursor-pointer self-center border-b border-transparent pb-0.5 text-[14px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:cursor-default"
            >
              {t("later")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
