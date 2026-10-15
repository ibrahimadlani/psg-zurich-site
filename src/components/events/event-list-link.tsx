"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * A row of the events list. Marked `data-selected` when its event is open on the right;
 * `data-default` for the next event, shown on a computer when none is picked yet.
 */
export function EventListLink({
  id,
  isDefault = false,
  className,
  children,
}: {
  id: string;
  isDefault?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  // The [id] segment under /evenements: the open event, or null on the list page.
  const segment = useSelectedLayoutSegment();
  const selected = segment === id;
  return (
    <Link
      href={`/evenements/${id}`}
      aria-current={selected ? "page" : undefined}
      data-selected={selected || undefined}
      data-default={(segment === null && isDefault) || undefined}
      className={cn("group relative block", className)}
    >
      {children}
    </Link>
  );
}
