"use client";

import { CameraOff, Check, CircleAlert, Clock, ScanLine, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { notify } from "@/lib/notify";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminButton, adminInput, adminLabel } from "@/components/admin/ui/styles";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

type EventOption = { id: string; title: string; startsAt: string; location: string | null };
type Count = { capacity: number | null; registered: number; present: number };
type ScannedMember = {
  id: string;
  name: string;
  memberNumber: string | null;
  image: string | null;
  state: "paid" | "unpaid" | "notAccepted";
  junior: boolean;
  photoConsent: boolean;
  signUp: { status: string; checkedInAt: string | null } | null;
  pickups: { id: string; reference: string; status: string; event: string | null; items: { description: string; quantity: number }[] }[];
};
type ScanData = { events: EventOption[]; count: Count | null; member: ScannedMember | null; unknown?: boolean };
type Result = { member: ScannedMember; token: string | null } | { unknown: true };
type Found = { id: string; name: string; memberNumber: string | null; image: string | null; email: string; paid: boolean };

/** The card's token, from the scanned URL (…/admin/scan/{token}) or the bare token. */
function tokenFrom(text: string) {
  const match = /\/admin\/scan\/([\w-]{16,32})/.exec(text) ?? /^([\w-]{16,32})$/.exec(text.trim());
  return match?.[1] ?? null;
}

async function load(params: Record<string, string | undefined>) {
  const query = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const response = await fetch(`/api/v1/admin/scan?${query}`);
  if (!response.ok) throw new Error();
  return ((await response.json()) as { data: ScanData }).data;
}

/**
 * Camera that reads member cards (the phone's QR detector, or jsQR where there is none, as on
 * iPhones), each read showing who it is in a sheet with one button to let them in. A name search
 * covers forgotten cards. The door count of the chosen event stays on top.
 */
export function Scanner({ initialEvent, initialCard }: { initialEvent: string | null; initialCard: string | null }) {
  const t = useTranslations("AdminScanner");
  const tProfile = useTranslations("MemberProfile");
  const format = useFormatter();
  const video = useRef<HTMLVideoElement>(null);
  const [events, setEvents] = useState<EventOption[] | null>(null);
  const [eventId, setEventId] = useState<string | null>(initialEvent);
  const [count, setCount] = useState<Count | null>(null);
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "denied" | "unsupported">("off");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  // The detector loop reads these without restarting.
  const paused = useRef(false);
  const lastRead = useRef<{ text: string; at: number } | null>(null);
  const eventRef = useRef(eventId);
  useEffect(() => {
    eventRef.current = eventId;
  }, [eventId]);

  // Who a card (token) or a name search (member id) is: the result sheet, scanning paused.
  const show = async (params: { token?: string; member?: string }) => {
    paused.current = true;
    try {
      const data = await load({ event: eventRef.current ?? undefined, ...params });
      setCount(data.count);
      setResult(data.member ? { member: data.member, token: params.token ?? null } : { unknown: true });
      navigator.vibrate?.(data.member ? 40 : [60, 60, 60]);
    } catch {
      notify.error(t("error"));
      paused.current = false;
    }
  };
  // The camera loop and the arrival read it through a ref (they don't restart for it).
  const showRef = useRef(show);
  useEffect(() => {
    showRef.current = show;
  });

  // Events around now; the first one (or the one asked for) is preselected. A card scanned with
  // the phone's own camera (/admin/scan/{token}) arrives here and shows at once.
  useEffect(() => {
    load({ event: initialEvent ?? undefined })
      .then((data) => {
        setEvents(data.events);
        setCount(data.count);
        const picked = initialEvent ?? data.events[0]?.id ?? null;
        if (!initialEvent && picked) setEventId(picked);
        eventRef.current = picked;
        if (initialCard) void showRef.current({ token: initialCard });
      })
      .catch(() => setEvents([]));
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new event picked: its door count.
  useEffect(() => {
    if (!eventId) return;
    load({ event: eventId })
      .then((data) => setCount(data.count))
      .catch(() => {});
  }, [eventId]);

  // Camera + QR reading loop.
  useEffect(() => {
    if (camera !== "starting") return;
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        if (!stopped) setCamera("denied");
        return;
      }
      const element = video.current;
      if (!element || stopped) return;
      element.srcObject = stream;
      await element.play().catch(() => {});
      setCamera("on");

      type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
      const Native = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
      const native = Native ? new Native({ formats: ["qr_code"] }) : null;
      const jsQR = native ? null : (await import("jsqr")).default;

      let last = 0;
      const tick = async (time: number) => {
        if (stopped) return;
        frame = requestAnimationFrame(tick);
        // ~6 reads a second is plenty, and spares the battery.
        if (paused.current || time - last < 160 || element.readyState < 2) return;
        last = time;
        let text: string | null = null;
        if (native) {
          const codes = await native.detect(element).catch(() => []);
          text = codes[0]?.rawValue ?? null;
        } else if (jsQR && context) {
          const width = Math.min(640, element.videoWidth);
          const height = Math.round((element.videoHeight / element.videoWidth) * width);
          canvas.width = width;
          canvas.height = height;
          context.drawImage(element, 0, 0, width, height);
          text = jsQR(context.getImageData(0, 0, width, height).data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
        }
        if (!text) return;
        // The same card held in front of the lens: once every 4 seconds.
        if (lastRead.current?.text === text && time - lastRead.current.at < 4000) return;
        lastRead.current = { text, at: time };
        const token = tokenFrom(text);
        if (token) void showRef.current({ token });
        else {
          paused.current = true;
          setResult({ unknown: true });
        }
      };
      frame = requestAnimationFrame(tick);
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [camera]);

  // Name search (card forgotten).
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) return;
    const controller = new AbortController();
    fetch(`/api/v1/admin/members?q=${encodeURIComponent(value)}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<{ data: Found[] }>) : null))
      .then((body) => body && setFound(body.data))
      .catch(() => {});
    return () => controller.abort();
  }, [query]);

  const next = () => {
    setResult(null);
    paused.current = false;
  };

  const letIn = async () => {
    if (!result || "unknown" in result || !eventId) return;
    setBusy(true);
    const response = result.token
      ? await fetch(`/api/v1/events/${eventId}/checkin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: result.token }) })
      : await fetch(`/api/v1/events/${eventId}/attendees`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ memberId: result.member.id, action: "checkin" }),
        });
    setBusy(false);
    if (!response.ok) {
      notify.error(t("error"));
      return;
    }
    navigator.vibrate?.([30, 40, 30]);
    notify.success(t("checkedIn", { name: result.member.name }));
    const data = await load({ event: eventId }).catch(() => null);
    if (data) setCount(data.count);
    next();
  };

  /** A shop order taken home: marked handed over, and gone from the sheet. */
  const handOver = async (orderId: string) => {
    if (!result || "unknown" in result) return;
    setBusy(true);
    const response = await fetch(`/api/v1/admin/orders/${orderId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "handed_over" }) });
    setBusy(false);
    if (!response.ok) {
      notify.error(t("error"));
      return;
    }
    notify.success(t("handedOver"));
    setResult({ ...result, member: { ...result.member, pickups: result.member.pickups.filter((pickup) => pickup.id !== orderId) } });
  };

  // Camera access exists (https or localhost, a browser that has it); assumed until the browser says.
  const supported = useSyncExternalStore(
    () => () => {},
    () => Boolean(navigator.mediaDevices?.getUserMedia),
    () => true,
  );
  const member = result && !("unknown" in result) ? result.member : null;
  const already = member?.signUp?.checkedInAt ? new Date(member.signUp.checkedInAt) : null;

  return (
    <div className="space-y-4">
      {/* The event at the door, and how many are in. */}
      <div className="flex items-end gap-3">
        <label className="min-w-0 flex-1 space-y-1.5">
          <span className={adminLabel}>{t("event")}</span>
          <select value={eventId ?? ""} onChange={(event) => setEventId(event.target.value || null)} className={adminInput} disabled={!events?.length}>
            {events?.length ? null : <option value="">{events ? t("noEvent") : t("loading")}</option>}
            {events?.map((event) => (
              <option key={event.id} value={event.id}>
                {format.dateTime(new Date(event.startsAt), { weekday: "short", hour: "2-digit", minute: "2-digit" })} · {event.title}
              </option>
            ))}
          </select>
        </label>
        {count ? (
          <p className="shrink-0 text-right leading-none" aria-live="polite">
            <span className="font-narrow text-[40px] font-extrabold tabular-nums italic">{count.present}</span>
            <span className="font-narrow text-[24px] font-extrabold text-muted-foreground tabular-nums italic">/{count.registered}</span>
            <span className="block pt-1 text-[11px] text-muted-foreground">{t("presentShort")}</span>
          </p>
        ) : null}
      </div>

      {/* The viewfinder. */}
      <div className="relative aspect-square overflow-hidden rounded-[18px] border bg-black sm:aspect-video">
        <video ref={video} playsInline muted className={cn("size-full object-cover", camera === "on" ? "opacity-100" : "opacity-0")} />
        {camera === "on" ? (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-[18%] rounded-[16px] border-2 border-white/80 shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)]" />
            <span aria-hidden className="pointer-events-none absolute inset-x-[20%] top-1/2 h-0.5 animate-pulse bg-psg-red/80" />
            <button type="button" onClick={() => setCamera("off")} className="absolute top-3 right-3 grid size-10 cursor-pointer place-items-center rounded-full bg-black/50 text-white backdrop-blur">
              <X className="size-5" aria-hidden />
              <span className="sr-only">{t("stop")}</span>
            </button>
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
            <div className="max-w-xs space-y-4">
              {camera === "denied" || !supported ? (
                <>
                  <CameraOff className="mx-auto size-8 opacity-70" aria-hidden />
                  <p className="text-sm text-pretty text-white/80">{t(supported ? "denied" : "unsupported")}</p>
                </>
              ) : (
                <>
                  <ScanLine className="mx-auto size-9 opacity-80" aria-hidden />
                  <p className="text-sm text-pretty text-white/80">{t("intro")}</p>
                  <button type="button" disabled={camera === "starting"} onClick={() => setCamera("starting")} className={adminButton("primary", "md", "bg-white text-psg-blue")}>
                    {t(camera === "starting" ? "starting" : "start")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card forgotten: by name. */}
      {searching ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{t("searchPlaceholder")}</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} className={cn(adminInput, "pl-9")} />
            </label>
            <button
              type="button"
              onClick={() => {
                setSearching(false);
                setQuery("");
                setFound([]);
              }}
              className={adminButton("ghost", "icon")}
            >
              <X aria-hidden />
              <span className="sr-only">{t("close")}</span>
            </button>
          </div>
          {query.trim().length >= 2 ? (
            found.length ? (
              <ul className="divide-y rounded-[12px] border bg-card">
                {found.map((person) => (
                  <li key={person.id}>
                    <button type="button" onClick={() => void show({ member: person.id })} className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left hover:bg-foreground/[0.03]">
                      <UserAvatar name={person.name} email={person.email} image={person.image} className="size-9 rounded-[9px] text-[10px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{person.name}</span>
                        <span className="block truncate text-[12px] text-muted-foreground">{person.memberNumber ?? person.email}</span>
                      </span>
                      {person.paid ? null : <StatusPill tone="danger">{t("unpaid")}</StatusPill>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-1 text-[13px] text-muted-foreground">{t("noMatch")}</p>
            )
          ) : null}
        </div>
      ) : (
        <button type="button" onClick={() => setSearching(true)} className={adminButton("secondary", "md", "w-full")}>
          <UserRound aria-hidden />
          {t("byName")}
        </button>
      )}

      {/* What was read: who, may they come in, one button. */}
      <div
        data-open={result !== null || undefined}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 translate-y-full px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[open]:pointer-events-auto data-[open]:translate-y-0 lg:right-auto lg:left-1/2 lg:w-[30rem] lg:-translate-x-1/2"
        role="dialog"
        aria-live="assertive"
        aria-label={t("resultLabel")}
      >
        {result ? (
          <div
            className={cn(
              "space-y-4 rounded-[18px] border-2 bg-popover p-5 shadow-2xl",
              "unknown" in result || member?.state === "notAccepted" ? "border-psg-red" : member?.state === "unpaid" ? "border-amber-500" : "border-emerald-600",
            )}
          >
            {member ? (
              <>
                <div className="flex items-center gap-4">
                  <UserAvatar name={member.name} email={member.name} image={member.image} className="size-16 rounded-[14px] text-[16px]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-narrow text-[34px] leading-[0.9] font-extrabold uppercase italic">{member.name}</p>
                    {member.memberNumber ? <p className="pt-1 font-mono text-[12px] text-muted-foreground">{member.memberNumber}</p> : null}
                  </div>
                </div>
                <p
                  className={cn(
                    "flex items-center gap-2 text-[15px] font-semibold",
                    member.state === "paid" ? "text-ok" : member.state === "unpaid" ? "text-amber-600 dark:text-amber-400" : "text-psg-red",
                  )}
                >
                  {member.state === "paid" ? <Check className="size-5" aria-hidden /> : member.state === "unpaid" ? <Clock className="size-5" aria-hidden /> : <CircleAlert className="size-5" aria-hidden />}
                  {t(`state.${member.state}`)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {member.junior ? <StatusPill tone="brand">{tProfile("junior")}</StatusPill> : null}
                  {member.photoConsent ? null : (
                    <StatusPill tone="warn">
                      <CameraOff aria-hidden />
                      {tProfile("noPhotos")}
                    </StatusPill>
                  )}
                  <StatusPill>
                    {already
                      ? t("alreadyIn", { time: format.dateTime(already, { hour: "2-digit", minute: "2-digit" }) })
                      : member.signUp?.status === "registered"
                        ? t("registered")
                        : member.signUp?.status === "waitlisted"
                          ? t("waitlisted")
                          : t("notRegistered")}
                  </StatusPill>
                </div>
                {/* Shop orders waiting for this member: handed over in one tap. */}
                {member.pickups.length ? (
                  <ul className="space-y-2 rounded-[12px] border border-psg-blue/30 bg-psg-blue/5 p-3">
                    <li className={adminLabel}>{t("pickups")}</li>
                    {member.pickups.map((pickup) => (
                      <li key={pickup.id} className="flex items-center gap-3">
                        <ShoppingBag className="size-4 shrink-0 text-psg-blue dark:text-foreground" aria-hidden />
                        <span className="min-w-0 flex-1 text-[14px]">
                          {pickup.items.map((item) => `${item.quantity} × ${item.description}`).join(", ")}
                          <span className="block font-mono text-[11px] text-muted-foreground">
                            {pickup.reference}
                            {pickup.event ? ` · ${pickup.event}` : ""}
                          </span>
                        </span>
                        <button type="button" disabled={busy} onClick={() => handOver(pickup.id)} className={adminButton("primary", "sm")}>
                          {t("handOver")}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                  <button type="button" onClick={next} className={adminButton("secondary")}>
                    {t("skip")}
                  </button>
                  <button type="button" disabled={busy || !eventId || Boolean(already)} onClick={letIn} className={adminButton(member.state === "paid" ? "ok" : "primary", "md", "h-12 text-[12px]")}>
                    <Check aria-hidden />
                    {already ? t("inAlready") : t("letIn")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 font-narrow text-[30px] leading-none font-extrabold text-psg-red uppercase italic">
                  <CircleAlert className="size-6" aria-hidden />
                  {t("unknown")}
                </p>
                <p className="text-sm text-muted-foreground">{t("unknownHint")}</p>
                <button type="button" onClick={next} className={adminButton("secondary", "md", "w-full")}>
                  {t("skip")}
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
