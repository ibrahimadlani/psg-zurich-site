"use client";

import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

type Participant = { memberId: string; name: string; email: string; image: string | null };

// Avatars are 36 px and overlap by 6 px: each one after the first takes 30 px.
const SIZE = 36;
const STEP = 30;

/** Name bubble above an avatar, on hover and on keyboard focus (or a tap on phones). */
const bubble =
  "pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 translate-y-1 rounded-[6px] bg-foreground px-2 py-1 text-[12px] font-medium whitespace-nowrap text-background opacity-0 shadow-brand transition-[opacity,transform] duration-150 group-hover/avatar:translate-y-0 group-hover/avatar:opacity-100 group-focus-visible/avatar:translate-y-0 group-focus-visible/avatar:opacity-100 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-foreground";

/** How many avatars fit on one line, keeping room for the "+N" chip when some are left out. */
function fitting(width: number, total: number) {
  const capacity = (count: number) => SIZE + (count - 1) * STEP;
  if (capacity(total) <= width) return total;
  // The chip counts as one more avatar.
  return Math.max(1, Math.floor((width - SIZE) / STEP));
}

/**
 * Who is coming: overlapping avatars in sign-up order on a single line, each with its name in a
 * bubble; the signed-in member is ringed in red. When they don't all fit, the last place goes
 * to a "+N" chip that lists the others.
 */
export function EventParticipants({ participants, me }: { participants: Participant[]; me: string | null }) {
  const t = useTranslations("Events");
  const list = useRef<HTMLUListElement>(null);
  // Before the first measure (server render), a reasonable guess.
  const [shownCount, setShownCount] = useState(Math.min(participants.length, 8));

  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const measure = () => setShownCount(fitting(element.clientWidth, participants.length));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [participants.length]);

  if (participants.length === 0) return <span className="text-base text-muted-foreground">{t("nobodyYet")}</span>;
  const shown = participants.slice(0, shownCount);
  const others = participants.slice(shownCount);

  return (
    <ul ref={list} className="flex w-full items-center pl-1.5" aria-label={t("withWho")}>
      {shown.map((person, index) => {
        const mine = person.memberId === me;
        const name = mine ? `${person.name} · ${t("you")}` : person.name;
        return (
          <li key={person.memberId} className="-ml-1.5 shrink-0" style={{ zIndex: shown.length - index + 1 }}>
            <span
              tabIndex={0}
              aria-label={name}
              className="group/avatar relative block rounded-full outline-none transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1 focus-visible:-translate-y-1"
            >
              <UserAvatar
                name={person.name}
                email={person.email}
                image={person.image}
                className={cn("size-9 text-[11px] ring-2", mine ? "ring-psg-red" : "ring-background")}
              />
              <span role="tooltip" className={bubble}>
                {name}
              </span>
            </span>
          </li>
        );
      })}
      {others.length > 0 ? (
        <li className="-ml-1.5 shrink-0">
          <span
            tabIndex={0}
            aria-label={t("others", { count: others.length })}
            className="group/avatar relative grid size-9 place-items-center rounded-full bg-card text-[12px] font-semibold ring-2 ring-background outline-none tabular-nums shadow-[inset_0_0_0_1px_var(--color-border)] transition-transform duration-200 ease-out hover:-translate-y-1 focus-visible:-translate-y-1"
          >
            +{others.length}
            <span role="tooltip" className={cn(bubble, "w-max max-w-64 text-center whitespace-normal")}>
              {others.map((person) => person.name).join(", ")}
            </span>
          </span>
        </li>
      ) : null}
    </ul>
  );
}
