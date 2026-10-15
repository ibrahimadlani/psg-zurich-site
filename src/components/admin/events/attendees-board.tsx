"use client";

import { ArrowUp, CameraOff, Check, Search, UserMinus, UserPlus, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useDeferredValue, useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminButton, adminInput, adminLabel } from "@/components/admin/ui/styles";
import { UserAvatar } from "@/components/user-avatar";
import { Link, useRouter } from "@/i18n/navigation";
import type { Attendee } from "@/lib/admin/events-query";
import { cn } from "@/lib/utils";

type Action = "checkin" | "uncheck" | "promote" | "remove" | "add";
type Found = { id: string; name: string; memberNumber: string | null; image: string | null; email: string; paid: boolean };

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** "Ajouter un membre": a search that signs the picked member up. */
function AddAttendee({ onAdd, taken }: { onAdd: (member: Found) => void; taken: string[] }) {
  const t = useTranslations("AdminEvents");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const search = useDeferredValue(query.trim());

  useEffect(() => {
    if (search.length < 2) return;
    const controller = new AbortController();
    fetch(`/api/v1/admin/members?q=${encodeURIComponent(search)}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<{ data: Found[] }>) : null))
      .then((body) => body && setResults(body.data))
      .catch(() => {});
    return () => controller.abort();
  }, [search]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={adminButton("secondary", "sm")}>
        <UserPlus aria-hidden />
        {t("addAttendee")}
      </button>
    );
  }
  const visible = search.length >= 2 ? results.filter((member) => !taken.includes(member.id)) : [];
  return (
    <div className="space-y-2 rounded-[12px] border bg-card p-3">
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t("addSearch")}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("addSearch")} className={cn(adminInput, "pl-9")} />
        </label>
        <button type="button" onClick={() => setOpen(false)} className={adminButton("ghost", "icon")} title={t("close")}>
          <X aria-hidden />
          <span className="sr-only">{t("close")}</span>
        </button>
      </div>
      {visible.length ? (
        <ul className="divide-y">
          {visible.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(member);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-3 py-2 text-left hover:bg-foreground/[0.03]"
              >
                <UserAvatar name={member.name} email={member.email} image={member.image} className="size-8 rounded-[8px] text-[10px]" />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{member.name}</span>
                {member.paid ? null : <StatusPill tone="danger">{t("unpaid")}</StatusPill>}
              </button>
            </li>
          ))}
        </ul>
      ) : search.length >= 2 ? (
        <p className="px-1 text-[13px] text-muted-foreground">{t("addNone")}</p>
      ) : null}
    </div>
  );
}

/**
 * Who comes: places, waiting list and withdrawals; at the door, a tap marks someone present.
 * Changes show at once (the server confirms behind); a promotion from the waiting list emails
 * the member.
 */
export function AttendeesBoard({ eventId, attendees, capacity }: { eventId: string; attendees: Attendee[]; capacity: number | null }) {
  const t = useTranslations("AdminEvents");
  const tProfile = useTranslations("MemberProfile");
  const format = useFormatter();
  const router = useRouter();
  const ask = useConfirm();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [list, apply] = useOptimistic(attendees, (current, change: { memberId: string; action: Action; added?: Attendee }) => {
    if (change.added) return [...current.filter((person) => person.memberId !== change.memberId), change.added];
    return current.map((person) => {
      if (person.memberId !== change.memberId) return person;
      if (change.action === "checkin") return { ...person, status: "registered" as const, checkedInAt: new Date() };
      if (change.action === "uncheck") return { ...person, checkedInAt: null };
      if (change.action === "promote") return { ...person, status: "registered" as const };
      return { ...person, status: "cancelled" as const, checkedInAt: null };
    });
  });

  const send = (memberId: string, action: Action, added?: Attendee) =>
    startTransition(async () => {
      apply({ memberId, action, added });
      const response = await fetch(`/api/v1/events/${eventId}/attendees`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId, action }),
      });
      if (!response.ok) toast.error(t("attendeeError"));
      else if (action === "checkin") navigator.vibrate?.(30);
      router.refresh();
    });

  const matches = useMemo(() => {
    const words = fold(search).split(/\s+/).filter(Boolean);
    return list.filter((person) => words.every((word) => fold(`${person.firstName} ${person.lastName} ${person.memberNumber ?? ""}`).includes(word)));
  }, [list, search]);
  const registered = matches.filter((person) => person.status === "registered" || person.status === "attended");
  const waitlisted = matches.filter((person) => person.status === "waitlisted");
  const cancelled = matches.filter((person) => person.status === "cancelled");
  const present = list.filter((person) => person.checkedInAt).length;
  const signedUp = list.filter((person) => person.status === "registered" || person.status === "attended").length;

  const row = (person: Attendee, kind: "place" | "waiting" | "out") => {
    const name = `${person.firstName} ${person.lastName}`.trim();
    return (
      <li key={person.memberId} className="flex items-center gap-3 py-2.5">
        <UserAvatar name={name} email={person.email} image={person.image} className="size-9 rounded-[9px] text-[10px]" />
        <Link href={`/admin/membres/${person.memberId}`} prefetch={false} className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold hover:underline">{name}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
            {person.memberNumber ? <span>{person.memberNumber}</span> : null}
            {person.junior ? <span className="text-psg-blue dark:text-foreground">{tProfile("junior")}</span> : null}
            {person.photoConsent !== true ? (
              <span className="inline-flex items-center gap-1">
                <CameraOff className="size-3" aria-hidden />
                {tProfile("noPhotos")}
              </span>
            ) : null}
            {!person.paid ? <span className="text-psg-red">{t("unpaid")}</span> : null}
          </span>
        </Link>
        {kind === "place" ? (
          person.checkedInAt ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => send(person.memberId, "uncheck")}
              title={t("uncheck")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              <Check className="size-3.5" aria-hidden />
              {format.dateTime(person.checkedInAt, { hour: "2-digit", minute: "2-digit" })}
            </button>
          ) : (
            <button type="button" disabled={pending} onClick={() => send(person.memberId, "checkin")} className={adminButton("secondary", "sm")}>
              <Check aria-hidden />
              <span className="max-sm:sr-only">{t("checkIn")}</span>
            </button>
          )
        ) : null}
        {kind === "waiting" ? (
          <button type="button" disabled={pending} onClick={() => send(person.memberId, "promote")} className={adminButton("secondary", "sm")}>
            <ArrowUp aria-hidden />
            <span className="max-sm:sr-only">{t("promote")}</span>
          </button>
        ) : null}
        {kind === "out" ? (
          <button type="button" disabled={pending} onClick={() => send(person.memberId, "add")} className={adminButton("ghost", "sm")}>
            <UserPlus aria-hidden />
            <span className="max-sm:sr-only">{t("reinstate")}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            title={t("remove")}
            onClick={async () => {
              if ((await ask({ title: t("removeTitle", { name }), body: kind === "place" ? t("removeBody") : undefined, confirmLabel: t("remove"), tone: "danger" })) !== null) {
                send(person.memberId, "remove");
              }
            }}
            className={adminButton("ghost", "icon")}
          >
            <UserMinus aria-hidden />
            <span className="sr-only">{t("remove")}</span>
          </button>
        )}
      </li>
    );
  };

  return (
    <section className="space-y-4" aria-labelledby="attendees">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="attendees" className={adminLabel}>
            {t("attendeesTitle")}
          </h2>
          {/* The door count, live. */}
          <p className="mt-1 font-narrow text-[32px] leading-none font-extrabold tabular-nums italic" aria-live="polite">
            {present}
            <span className="text-muted-foreground">/{signedUp}</span>
            <span className="ml-2 align-middle font-sans text-[13px] font-normal text-muted-foreground not-italic">
              {t("presentOf", { capacity: capacity ?? "∞" })}
            </span>
          </p>
        </div>
        <AddAttendee
          taken={list.filter((person) => person.status !== "cancelled").map((person) => person.memberId)}
          onAdd={(member) => {
            const [firstName, ...rest] = member.name.split(" ");
            send(member.id, "add", {
              memberId: member.id,
              firstName: firstName ?? "",
              lastName: rest.join(" "),
              memberNumber: member.memberNumber,
              phone: null,
              status: "registered",
              checkedInAt: null,
              signedUpAt: new Date(),
              photoConsent: null,
              email: member.email,
              image: member.image,
              paid: member.paid,
              junior: false,
            });
          }}
        />
      </div>

      {list.length > 6 ? (
        <label className="relative block">
          <span className="sr-only">{t("searchAttendees")}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchAttendees")} className={cn(adminInput, "pl-9")} />
        </label>
      ) : null}

      <div className="space-y-1">
        <h3 className="text-[13px] font-semibold">
          {t("places")} <span className="font-normal text-muted-foreground tabular-nums">{registered.length}</span>
        </h3>
        {registered.length ? <ul className="divide-y border-y">{registered.map((person) => row(person, "place"))}</ul> : <p className="border-y py-3 text-sm text-muted-foreground">{t("noAttendees")}</p>}
      </div>

      {waitlisted.length ? (
        <div className="space-y-1">
          <h3 className="text-[13px] font-semibold">
            {t("waitlist")} <span className="font-normal text-muted-foreground tabular-nums">{waitlisted.length}</span>
          </h3>
          <ul className="divide-y border-y">{waitlisted.map((person) => row(person, "waiting"))}</ul>
        </div>
      ) : null}

      {cancelled.length ? (
        <details className="group">
          <summary className="cursor-pointer text-[13px] text-muted-foreground hover:text-foreground">
            {t("withdrawn", { count: cancelled.length })}
          </summary>
          <ul className="mt-1 divide-y border-y opacity-75">{cancelled.map((person) => row(person, "out"))}</ul>
        </details>
      ) : null}
    </section>
  );
}
