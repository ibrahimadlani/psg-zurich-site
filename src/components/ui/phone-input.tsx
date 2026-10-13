"use client";

import { ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { useState } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import {
  PHONE_COUNTRIES,
  callingCode,
  flag,
  formatAsYouType,
  splitPhone,
  type PhoneCountry,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  /** Stored value: E.164 ("+41791234567") or empty. */
  value: string;
  /** E.164 when the number is complete and valid; otherwise "+41 …" as typed (fails validation). */
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  /** Classes of the outer box (border, height, radius) so it matches the surrounding form. */
  className?: string;
  countryLabel: string;
};

/**
 * Phone field: country picker (flag + calling code; Switzerland and neighbours) and the
 * national number, grouped the country's way while typing. A pasted "+33 6 …" switches the
 * country by itself. The native <select> keeps the phone's own picker on mobile.
 */
export function PhoneInput({ id, value, onChange, invalid, describedBy, className, countryLabel }: Props) {
  const locale = useLocale();
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const [initial] = useState(() => splitPhone(value));
  const [country, setCountry] = useState<PhoneCountry>(initial.country);
  const [national, setNational] = useState(initial.national);

  const emit = (text: string, inCountry: PhoneCountry) => {
    const digits = text.replace(/[^\d+]/g, "");
    if (!digits) return onChange("");
    const parsed = parsePhoneNumberFromString(text, inCountry);
    onChange(parsed?.isValid() ? parsed.number : `${callingCode(inCountry)} ${text}`);
  };

  const type = (text: string, deleting: boolean) => {
    // A complete international number (pasted, or typed with +): take its country when
    // allowed. While it is still being typed, it stays as it is.
    if (text.trim().startsWith("+")) {
      const parsed = parsePhoneNumberFromString(text);
      const found = parsed?.country as PhoneCountry | undefined;
      if (parsed?.isValid() && found && (PHONE_COUNTRIES as readonly string[]).includes(found)) {
        const nationalText = parsed.formatNational();
        setCountry(found);
        setNational(nationalText);
        return emit(nationalText, found);
      }
    }
    // While deleting, keep the text as it is (else a space could never be erased); typing regroups.
    const next = deleting ? text : formatAsYouType(text, country);
    setNational(next);
    emit(next, country);
  };

  return (
    <div
      aria-invalid={invalid || undefined}
      className={cn(
        "flex items-stretch overflow-hidden focus-within:border-primary focus-within:shadow-[0_0_0_3px_oklch(0.62_0.13_248/0.2)] aria-invalid:border-destructive",
        className,
      )}
    >
      <label className="relative flex shrink-0 items-center gap-1.5 border-r pr-2 pl-3 text-[14px] tabular-nums">
        <span aria-hidden className="text-[16px] leading-none">
          {flag(country)}
        </span>
        <span aria-hidden>{callingCode(country)}</span>
        <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
        <select
          aria-label={countryLabel}
          value={country}
          onChange={(event) => {
            const next = event.target.value as PhoneCountry;
            setCountry(next);
            emit(national, next);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {PHONE_COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {`${flag(code)} ${names.of(code) ?? code} (${callingCode(code)})`}
            </option>
          ))}
        </select>
      </label>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={national}
        maxLength={24}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) =>
          type(event.target.value, (event.nativeEvent as InputEvent).inputType?.startsWith("delete") ?? false)
        }
        className="min-w-0 flex-1 bg-transparent px-3 text-[14px] outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
