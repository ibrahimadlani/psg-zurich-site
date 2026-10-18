"use client";

import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/client";

/** A link whose clicks are counted for the audience page (e.g. an event's card). */
export function TrackedLink({ event, countAs, onClick, ...props }: ComponentProps<typeof Link> & { event: string; countAs: { type: string; id: string } }) {
  return (
    <Link
      {...props}
      onClick={(click) => {
        track(event, countAs.type, countAs.id);
        onClick?.(click);
      }}
    />
  );
}
