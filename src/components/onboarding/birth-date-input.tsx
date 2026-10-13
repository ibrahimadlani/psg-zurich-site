"use client";

import { useRef } from "react";
import { inputClass, labelClass } from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";

export type DateParts = { day: string; month: string; year: string };

export const emptyDate: DateParts = { day: "", month: "", year: "" };

export const partsFromIso = (iso: string | null | undefined): DateParts => {
  const [year = "", month = "", day = ""] = iso?.split("-") ?? [];
  return { day, month, year };
};

/** "YYYY-MM-DD" for a real calendar date, "" when empty, null when incomplete or impossible. */
export function isoFromParts({ day, month, year }: DateParts): string | null {
  if (!day && !month && !year) return "";
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth() !== Number(month) - 1) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Birth date as three short fields (day, month, year): numeric keypad on phones, the cursor
 * moves on by itself once a field is full and back with Backspace on an empty one.
 */
export function BirthDateInput({
  id,
  value,
  onChange,
  labels,
  invalid,
  describedBy,
}: {
  id: string;
  value: DateParts;
  onChange: (value: DateParts) => void;
  labels: { day: string; month: string; year: string };
  invalid?: boolean;
  describedBy?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const fields = [
    { key: "day", length: 2, placeholder: "31", width: "w-[64px]" },
    { key: "month", length: 2, placeholder: "01", width: "w-[64px]" },
    { key: "year", length: 4, placeholder: "2000", width: "w-[92px]" },
  ] as const;

  return (
    <div className="flex items-end gap-2">
      {fields.map((field, index) => (
        <div key={field.key} className="flex flex-col gap-[7px]">
          <label htmlFor={`${id}-${field.key}`} className={labelClass}>
            {labels[field.key]}
          </label>
          <input
            id={`${id}-${field.key}`}
            ref={(element) => {
              refs.current[index] = element;
            }}
            inputMode="numeric"
            autoComplete={`bday-${field.key}`}
            maxLength={field.length}
            placeholder={field.placeholder}
            value={value[field.key]}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "").slice(0, field.length);
              onChange({ ...value, [field.key]: digits });
              if (digits.length === field.length) refs.current[index + 1]?.focus();
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && value[field.key] === "" && index > 0) refs.current[index - 1]?.focus();
            }}
            className={cn(inputClass, field.width, "h-11 text-center text-[16px] tabular-nums")}
          />
        </div>
      ))}
    </div>
  );
}
