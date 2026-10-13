"use client";

import { Check } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const tick = (on: boolean) => (
  <Check
    aria-hidden
    className={cn(
      "size-3.5 shrink-0 transition-[opacity,transform] duration-200 ease-out",
      on ? "scale-100 opacity-100" : "scale-50 opacity-0",
    )}
    strokeWidth={2.5}
  />
);

/** Several answers (toggle buttons). */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (value: T[]) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((item) => item !== option.value) : [...value, option.value])}
            className={cn(
              "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[14px] [transition:background-color_.2s,border-color_.2s,color_.2s,transform_.15s] active:scale-[0.97]",
              on ? "border-segment bg-segment text-segment-foreground" : "bg-card hover:border-foreground/30",
            )}
          >
            {/* Same width selected or not (no reflow of the other chips): unselected, the label
                slides over the hidden tick's room to look centred. */}
            <span className={cn("flex items-center gap-1.5 transition-transform duration-200 ease-out", !on && "-translate-x-[10px]")}>
              {tick(on)}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** One answer among a few (radio group, arrow keys move and select). */
export function ChoiceCards<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; description?: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.findIndex((option) => option.value === value);

  const move = (from: number, step: number) => {
    const next = (from + step + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {options.map((option, index) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            // Only one stop in the tab order: the selected card, else the first.
            tabIndex={on || (selected === -1 && index === 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3 text-left [transition:background-color_.2s,border-color_.2s,color_.2s,transform_.15s] active:scale-[0.98]",
              on ? "border-segment bg-segment text-segment-foreground" : "bg-card hover:border-foreground/30",
            )}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-medium">{option.label}</span>
              {option.description ? (
                <span className={cn("text-[13px] transition-colors", on ? "text-segment-foreground/75" : "text-muted-foreground")}>
                  {option.description}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                on ? "border-segment-foreground/40" : "border-foreground/20",
              )}
            >
              {tick(on)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
