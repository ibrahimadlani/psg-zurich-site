"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AuthPanel, FieldError, inputClass, labelClass, submitClass } from "@/components/auth/auth-ui";
import { AddressAutocomplete } from "@/components/maps/address-autocomplete";
import { PhoneInput } from "@/components/ui/phone-input";
import { useRouter } from "@/i18n/navigation";
import { MEMBER_ADDRESS_REGIONS, type PickedAddress } from "@/lib/google-maps";
import { normalizePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

/**
 * Two optional details asked once, after the email is confirmed: phone and postal address.
 * "Later" ends the step too; both can be changed in the settings.
 */
export function OnboardingForm({ firstName, pending, next }: { firstName: string; pending: boolean; next: string }) {
  const t = useTranslations("Onboarding");
  const tMembership = useTranslations("Membership");
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [addressText, setAddressText] = useState("");
  const [picked, setPicked] = useState<PickedAddress | null>(null);
  const [busy, startTransition] = useTransition();
  const phoneInvalid = phoneChecked && phone !== "" && normalizePhone(phone) === null;

  const finish = (skip: boolean) => {
    if (!skip && phone !== "" && normalizePhone(phone) === null) {
      setPhoneChecked(true);
      return;
    }
    startTransition(async () => {
      const address = skip
        ? {}
        : picked
          ? { address: picked.street, postcode: picked.postcode, city: picked.city }
          : { address: addressText.trim() };
      const response = await fetch("/api/v1/me/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(skip ? {} : { phone, ...address }),
      });
      if (!response.ok) {
        toast.error(t("error"));
        return;
      }
      if (!skip && (phone || addressText.trim())) toast.success(t("saved"));
      router.replace(next);
      router.refresh();
    });
  };

  return (
    <AuthPanel title={t("title", { name: firstName })} body={pending ? t("bodyPending") : t("body")}>
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          finish(false);
        }}
      >
        <div className="flex min-w-0 flex-col gap-[7px]">
          <label htmlFor="onboarding-phone" className={labelClass}>
            {tMembership("phone")}
          </label>
          <PhoneInput
            id="onboarding-phone"
            value={phone}
            onChange={setPhone}
            invalid={phoneInvalid}
            describedBy="onboarding-phone-error"
            countryLabel={tMembership("phoneCountry")}
            className="h-[38px] rounded-[8px] border bg-card [transition:border-color_.2s,box-shadow_.2s]"
          />
          <FieldError id="onboarding-phone-error">{phoneInvalid ? tMembership("invalidPhone") : null}</FieldError>
        </div>
        <div className="flex min-w-0 flex-col gap-[7px]">
          <label htmlFor="onboarding-address" className={labelClass}>
            {tMembership("address")}
          </label>
          {/* One field: the suggestion gives street, postcode and city at once. */}
          <AddressAutocomplete
            id="onboarding-address"
            className={cn(inputClass, "px-3")}
            maxLength={255}
            placeholder={t("addressPlaceholder")}
            regions={MEMBER_ADDRESS_REGIONS}
            value={addressText}
            onChange={(value) => {
              setAddressText(value);
              setPicked(null);
            }}
            onPick={setPicked}
          />
        </div>
        <p className="text-[12px] text-muted-foreground">{t("hint")}</p>
        <button type="submit" disabled={busy} className={cn(submitClass, "mt-1")}>
          {t("continue")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => finish(true)}
          className="cursor-pointer self-center border-b border-transparent pb-0.5 text-[14px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:cursor-default"
        >
          {t("later")}
        </button>
      </form>
    </AuthPanel>
  );
}
