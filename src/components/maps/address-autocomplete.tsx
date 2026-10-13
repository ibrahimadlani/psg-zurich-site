"use client";

import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MAPS_API_KEY,
  mapsEnabled,
  type PickedAddress,
} from "@/lib/google-maps";
import { cn } from "@/lib/utils";

type Props = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "onSelect"
> & {
  value: string;
  onChange: (value: string) => void;
  /** A suggestion was picked: full details of the place. */
  onPick: (address: PickedAddress) => void;
  /** Country codes to search in (none = anywhere). */
  regions?: string[];
};

/**
 * Text field with Google address suggestions (Places API, New). Typing stays free: picking a
 * suggestion only fills the details. Without an API key it is a plain text field.
 */
export function AddressAutocomplete(props: Props) {
  if (!mapsEnabled) {
    const { onChange, onPick: _onPick, regions: _regions, ...rest } = props;
    return (
      <input {...rest} onChange={(event) => onChange(event.target.value)} />
    );
  }
  return (
    <APIProvider apiKey={MAPS_API_KEY}>
      <Suggestions {...props} />
    </APIProvider>
  );
}

function Suggestions({
  value,
  onChange,
  onPick,
  regions,
  className,
  ...inputProps
}: Props) {
  const places = useMapsLibrary("places");
  const locale = useLocale();
  const listId = useId();
  const [suggestions, setSuggestions] = useState<
    google.maps.places.PlacePrediction[]
  >([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  // One session per search: suggestions + the details of the picked one are billed together.
  const session = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );
  const typed = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (!places || !typed.current) return;
    const input = value.trim();
    let stale = false;
    const timer = setTimeout(() => {
      if (input.length < 3) {
        setSuggestions([]);
        return;
      }
      session.current ??= new places.AutocompleteSessionToken();
      places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: session.current,
        language: locale,
        ...(regions?.length ? { includedRegionCodes: regions } : {}),
      })
        .then(({ suggestions: found }) => {
          if (stale) return;
          setSuggestions(
            found.flatMap((suggestion) =>
              suggestion.placePrediction ? [suggestion.placePrediction] : [],
            ),
          );
          setActive(-1);
        })
        .catch(() => {
          if (!stale) setSuggestions([]);
        });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [places, value, locale, regions]);

  async function pick(prediction: google.maps.places.PlacePrediction) {
    setOpen(false);
    setSuggestions([]);
    const place = prediction.toPlace();
    await place.fetchFields({
      fields: ["id", "formattedAddress", "location", "addressComponents"],
    });
    session.current = null;
    const part = (type: string) =>
      place.addressComponents?.find((component) =>
        component.types.includes(type),
      )?.longText ?? "";
    const formatted = place.formattedAddress ?? prediction.text.text;
    // Street line as written locally ("Langstrasse 10", "12 Rue de Rivoli"): the first part of
    // Google's formatted address when it holds the number, else street name + number.
    const firstLine = formatted.split(",")[0]!.trim();
    const number = part("street_number");
    const street = number && firstLine.includes(number) ? firstLine : [part("route"), number].filter(Boolean).join(" ");
    typed.current = false;
    onChange(formatted);
    onPick({
      formatted,
      street: street || prediction.mainText?.text || formatted,
      postcode: part("postal_code"),
      city:
        part("locality") ||
        part("postal_town") ||
        part("administrative_area_level_2"),
      placeId: place.id,
      latitude: place.location?.lat() ?? 0,
      longitude: place.location?.lng() ?? 0,
    });
  }

  const shown = open && suggestions.length > 0;

  // The list lives in <body> (cards clip their content): keep it under the field.
  useLayoutEffect(() => {
    if (!shown) return;
    const place = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect)
        setBox({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [shown]);

  return (
    <div className="relative">
      <input
        {...inputProps}
        ref={inputRef}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className={className}
        onChange={(event) => {
          typed.current = true;
          setOpen(true);
          onChange(event.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (!shown) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive(
              (index) =>
                (index + step + suggestions.length) % suggestions.length,
            );
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            void pick(suggestions[active]!);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {shown && box
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              style={{ top: box.top, left: box.left, width: box.width }}
              className="fixed z-50 overflow-hidden rounded-[10px] border bg-popover py-1 text-popover-foreground shadow-lg"
            >
              {suggestions.map((prediction, index) => (
                <li
                  key={prediction.placeId}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    void pick(prediction);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 px-3 py-2 text-[13px]",
                    index === active && "bg-foreground/5",
                  )}
                >
                  <MapPin
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {prediction.mainText?.text ?? prediction.text.text}
                    </span>
                    {prediction.secondaryText ? (
                      <span className="block truncate text-[12px] text-muted-foreground">
                        {prediction.secondaryText.text}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
              {/* Google's terms: suggestions shown without a Google map must say where they come
                  from. Kept as small as possible, in the corner, without a row of its own. */}
              <li
                aria-hidden
                className="pointer-events-none absolute right-2 bottom-0.5 text-[8px] leading-none text-muted-foreground/60"
              >
                Google
              </li>
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
