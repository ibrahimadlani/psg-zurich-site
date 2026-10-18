"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { notify } from "@/lib/notify";
import { z } from "zod";
import { AddressAutocomplete } from "@/components/maps/address-autocomplete";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { PhoneInput } from "@/components/ui/phone-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { MEMBER_ADDRESS_REGIONS } from "@/lib/google-maps";
import { normalizePhone } from "@/lib/phone";

const schema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().refine((value) => value === "" || normalizePhone(value) !== null),
  address: z.string().trim().max(255),
  postcode: z.string().trim().max(10),
  city: z.string().trim().max(100),
});
type Values = z.infer<typeof schema>;

/** Same look as <Input> for the address field (a plain input with suggestions). */
const inputClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

/** The member edits their own details; the email stays read-only. */
export function ProfileForm({ email, defaults, bare = false }: { email: string; defaults: Values; bare?: boolean }) {
  const t = useTranslations("MemberArea.profile");
  const tMembership = useTranslations("Membership");
  const router = useRouter();
  const { refetch } = useSession();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty, isSubmitted },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const [address, phone] = useWatch({ control, name: ["address", "phone"] });

  async function onSubmit(values: Values) {
    const response = await fetch("/api/v1/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      notify.error(t("error"));
      return;
    }
    notify.success(t("saved"));
    reset(values);
    // The header shows the name from the session.
    refetch();
    router.refresh();
  }

  const field = (name: keyof Values, props: React.ComponentProps<"input"> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`profile-${name}`}>
        {tMembership(name)}
        {name === "phone" || name === "address" || name === "postcode" || name === "city" ? (
          <span className="font-normal text-muted-foreground"> · {tMembership("optional")}</span>
        ) : null}
      </Label>
      <Input id={`profile-${name}`} aria-invalid={errors[name] ? true : undefined} {...props} {...register(name)} />
      <FieldError id={`profile-${name}-error`}>{errors[name] ? tMembership("required") : null}</FieldError>
    </div>
  );

  const content = (
      <div className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("firstName", { autoComplete: "given-name", maxLength: 100 })}
            {field("lastName", { autoComplete: "family-name", maxLength: 100 })}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">
              {tMembership("phone")}
              <span className="font-normal text-muted-foreground"> · {tMembership("optional")}</span>
            </Label>
            <PhoneInput
              id="profile-phone"
              value={phone}
              onChange={(value) => setValue("phone", value, { shouldDirty: true, shouldValidate: isSubmitted })}
              invalid={Boolean(errors.phone)}
              describedBy="profile-phone-error"
              countryLabel={tMembership("phoneCountry")}
              className="h-8 rounded-lg border border-input transition-colors dark:bg-input/30"
            />
            <FieldError id="profile-phone-error">{errors.phone ? tMembership("invalidPhone") : null}</FieldError>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-address">
              {tMembership("address")}
              <span className="font-normal text-muted-foreground"> · {tMembership("optional")}</span>
            </Label>
            {/* Picking a suggestion fills the postcode and the city too. */}
            <AddressAutocomplete
              id="profile-address"
              className={inputClass}
              maxLength={255}
              placeholder={tMembership("addressPlaceholder")}
              regions={MEMBER_ADDRESS_REGIONS}
              value={address}
              onChange={(value) => setValue("address", value, { shouldDirty: true })}
              onPick={(place) => {
                setValue("address", place.street, { shouldDirty: true });
                setValue("postcode", place.postcode, { shouldDirty: true });
                setValue("city", place.city, { shouldDirty: true });
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            {field("postcode", { autoComplete: "postal-code", maxLength: 10 })}
            {field("city", { autoComplete: "address-level2", maxLength: 100 })}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-email">{t("email")}</Label>
            <Input id="profile-email" value={email} readOnly disabled />
            <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
          </div>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? t("saving") : t("save")}
          </Button>
        </form>
      </div>
  );
  if (bare) return content;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
