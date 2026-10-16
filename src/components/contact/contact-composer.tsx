"use client";

import {
  ArrowRight,
  Bug,
  CalendarDays,
  Check,
  CircleHelp,
  Copy,
  CreditCard,
  Handshake,
  Loader2,
  ShieldCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { AutoTextarea } from "@/components/contact/auto-textarea";
import type { ContactTopic } from "@/db/schema";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ICONS: Record<ContactTopic, LucideIcon> = {
  join: UserPlus,
  events: CalendarDays,
  fees: CreditCard,
  partnership: Handshake,
  website: Bug,
  account: ShieldCheck,
  other: CircleHelp,
};

const MIN_BODY = 20;
const DRAFT_KEY = "psgz-contact-draft";

type Draft = { topic: ContactTopic | null; name: string; email: string; organisation: string; body: string };
type Errors = Partial<Record<"name" | "email" | "body", string>>;

function readDraft(): Partial<Draft> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<Draft>) : null;
  } catch {
    return null;
  }
}
function writeDraft(draft: Draft | null) {
  try {
    if (draft && (draft.body || draft.organisation)) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Private mode or storage blocked: the draft just isn't kept.
  }
}

const field =
  "h-12 w-full min-w-0 rounded-[10px] border border-input bg-background px-3.5 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 lg:h-11 lg:text-[15px] dark:bg-input/30";
const labelClass = "text-[13px] font-semibold";
const errorClass = "text-[13px] text-destructive";

/**
 * The heart of the contact page: pick what it's about, get the right help first (often enough to
 * not need writing at all), then a short form. Phones: big tiles, the send button stuck to the
 * bottom and above the keyboard, the draft kept if the network drops or the page is left.
 */
export function ContactComposer({
  view,
  identity,
  topics,
  initialTopic,
}: {
  view: "visitor" | "member";
  identity?: { name: string; email: string };
  topics: ContactTopic[];
  initialTopic: ContactTopic | null;
}) {
  const t = useTranslations("Contact");
  const tTopics = useTranslations("ContactTopics");
  const locale = useLocale();
  const keyboard = useKeyboardInset();
  const ids = useId();
  const startedAt = useRef(0);
  const formRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  const [topic, setTopic] = useState<ContactTopic | null>(initialTopic);
  // "Join": the online form comes first; writing is the second choice.
  const [question, setQuestion] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [page, setPage] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [restored, setRestored] = useState(false);
  const [result, setResult] = useState<{ reference: string; follow: string | null } | null>(null);

  // After the first paint: the time the form was shown, a draft left earlier, the page the
  // visitor came from (for a website problem).
  useEffect(() => {
    startedAt.current = Date.now();
    const draft = readDraft();
    let from = "";
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer && referrer.origin === window.location.origin && !referrer.pathname.includes("/contact")) from = referrer.pathname;
    } catch {
      // No usable referrer.
    }
    queueMicrotask(() => {
      if (from) setPage(from);
      if (!draft) return;
      if (draft.topic && !initialTopic && topics.includes(draft.topic)) setTopic(draft.topic);
      if (draft.name) setName(draft.name);
      if (draft.email) setEmail(draft.email);
      if (draft.organisation) setOrganisation(draft.organisation);
      if (draft.body) {
        setBody(draft.body);
        setRestored(true);
      }
    });
  }, [initialTopic, topics]);

  const save = (patch: Partial<Draft>) => writeDraft({ topic, name, email, organisation, body, ...patch });

  const choose = (next: ContactTopic) => {
    setTopic(next);
    setQuestion(false);
    setFailure(null);
    save({ topic: next });
    // Keep the URL shareable (?sujet=…) without a navigation.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("sujet", next);
      window.history.replaceState(null, "", url);
    } catch {
      // Not important.
    }
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      formRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (view === "visitor") {
      if (name.trim().length < 2) next.name = t("form.required");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = email.trim() ? t("form.invalidEmail") : t("form.required");
    }
    if (body.trim().length < MIN_BODY) next.body = t("form.tooShort", { count: MIN_BODY - body.trim().length });
    return next;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!topic || sending) return;
    const found = validate();
    setErrors(found);
    const first = (["name", "email", "body"] as const).find((key) => found[key]);
    if (first) {
      document.getElementById(`${ids}-${first}`)?.focus();
      return;
    }
    setSending(true);
    setFailure(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic,
          ...(view === "visitor" ? { name: name.trim(), email: email.trim() } : {}),
          organisation: topic === "partnership" ? organisation.trim() || undefined : undefined,
          page: topic === "website" ? page.trim() || undefined : undefined,
          body: body.trim(),
          locale,
          startedAt: startedAt.current,
          website: String(form.get("website") ?? "") || undefined,
        }),
      });
      if (!response.ok) {
        const code = ((await response.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code;
        setFailure(code === "too_fast" ? t("form.errors.tooFast") : code === "too_many_requests" ? t("form.errors.tooMany") : t("form.errors.generic"));
        return;
      }
      const { data } = (await response.json()) as { data: { reference: string; follow: string | null } };
      writeDraft(null);
      setResult(data);
      requestAnimationFrame(() => {
        successRef.current?.focus();
        successRef.current?.scrollIntoView({ block: "center" });
      });
    } catch {
      setFailure(t("form.errors.generic"));
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setResult(null);
    setBody("");
    setOrganisation("");
    setTopic(null);
    setErrors({});
    setRestored(false);
    startedAt.current = Date.now();
  };

  if (result) {
    const steps = view === "visitor" ? (["email", "answer", "follow"] as const).map((key) => t(`success.steps.${key}`, { email })) : (["email", "answer", "follow"] as const).map((key) => t(`success.stepsMember.${key}`));
    const absolute = result.follow && !result.follow.startsWith("/");
    return (
      <section className="animate-page-in rounded-[18px] border bg-card p-[clamp(20px,4vw,32px)] shadow-brand motion-reduce:animate-none" aria-live="polite">
        <span className="grid size-12 place-items-center rounded-full bg-ok/15 text-ok">
          <Check className="size-6" aria-hidden />
        </span>
        <h2 ref={successRef} tabIndex={-1} className="mt-4 font-narrow text-[clamp(32px,7vw,44px)] leading-none font-extrabold uppercase italic outline-none">
          {t("success.title")}
        </h2>
        <p className="mt-4 font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{t("success.reference")}</p>
        <p className="font-mono text-[28px] font-semibold tracking-wide tabular-nums">{result.reference}</p>
        <ol className="mt-5 space-y-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-[15px] leading-snug">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-psg-blue text-[12px] font-semibold text-white tabular-nums dark:bg-white dark:text-psg-blue">{index + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {result.follow ? (
            absolute ? (
              <a href={result.follow} className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-psg-blue px-5 font-wide text-[11px] font-semibold tracking-[0.06em] text-white uppercase dark:bg-white dark:text-psg-blue">
                {t("success.follow")}
                <ArrowRight className="size-4" aria-hidden />
              </a>
            ) : (
              <Link href={result.follow} className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-psg-blue px-5 font-wide text-[11px] font-semibold tracking-[0.06em] text-white uppercase dark:bg-white dark:text-psg-blue">
                {t("success.follow")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )
          ) : null}
          {absolute ? (
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(result.follow!).then(() => toast.success(t("success.linkCopied")))}
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] border px-5 text-[14px] transition-colors hover:bg-foreground/5"
            >
              <Copy className="size-4" aria-hidden />
              {t("success.copyLink")}
            </button>
          ) : null}
          <button type="button" onClick={reset} className="inline-flex h-12 cursor-pointer items-center justify-center px-3 text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {t("success.another")}
          </button>
        </div>
      </section>
    );
  }

  const help = topic ? helpFor(topic, view) : null;
  const showForm = topic !== null && (topic !== "join" || view === "member" || question);
  const remaining = MIN_BODY - body.trim().length;

  return (
    <div className="space-y-5">
      {/* Topics: tiles until one is picked, then a compact line to change it. */}
      {topic === null ? (
        <section aria-labelledby={`${ids}-pick`} className="space-y-3">
          <h2 id={`${ids}-pick`} className="font-wide text-[11px] font-semibold tracking-[0.08em] uppercase">
            {t("pickTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {topics.map((value) => {
              const Icon = ICONS[value];
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose(value)}
                  className="group flex min-h-[88px] cursor-pointer flex-col items-start gap-2 rounded-[14px] border bg-card p-3.5 text-left transition-[border-color,transform,box-shadow] hover:border-foreground/30 hover:shadow-brand active:scale-[0.98] sm:min-h-[96px]"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-psg-blue text-white transition-colors group-hover:bg-psg-red dark:bg-white dark:text-psg-blue">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-[14px] leading-tight font-semibold text-balance">{tTopics(`${value}.label`)}</span>
                  <span className="hidden text-[12px] leading-snug text-muted-foreground sm:block">{tTopics(`${value}.hint`)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <div ref={formRef} className="flex scroll-mt-24 items-center gap-3 rounded-[14px] border bg-card p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-psg-blue text-white dark:bg-white dark:text-psg-blue">
            {(() => {
              const Icon = ICONS[topic];
              return <Icon className="size-4" aria-hidden />;
            })()}
          </span>
          <span className="min-w-0 flex-1 text-[15px] leading-tight font-semibold">{tTopics(`${topic}.label`)}</span>
          <button
            type="button"
            onClick={() => {
              setTopic(null);
              save({ topic: null });
            }}
            className="h-10 shrink-0 cursor-pointer rounded-full px-3 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("form.changeTopic")}
          </button>
        </div>
      )}

      {help ? (
        <div className="rounded-[14px] border border-dashed bg-background/60 p-4">
          <p className="text-[15px] leading-relaxed text-pretty">{t(help.text)}</p>
          {help.cta || (topic === "join" && view === "visitor" && !question) ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {help.cta ? (
                <Link href={help.cta.href} className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-psg-blue px-4 font-wide text-[10.5px] font-semibold tracking-[0.06em] text-white uppercase dark:bg-white dark:text-psg-blue">
                  {t(help.cta.label)}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : null}
              {topic === "join" && view === "visitor" && !question ? (
                <button type="button" onClick={() => setQuestion(true)} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-[10px] border px-4 text-[14px] transition-colors hover:bg-foreground/5">
                  {t("help.joinQuestion")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={submit} noValidate className="space-y-4" aria-describedby={failure ? `${ids}-failure` : undefined}>
          {/* Only robots fill this. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          {view === "visitor" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor={`${ids}-name`} className={labelClass}>
                  {t("form.name")}
                </label>
                <input
                  id={`${ids}-name`}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (errors.name) setErrors({ ...errors, name: undefined });
                    save({ name: event.target.value });
                  }}
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  maxLength={120}
                  placeholder={t("form.namePlaceholder")}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? `${ids}-name-error` : undefined}
                  className={field}
                />
                {errors.name ? (
                  <p id={`${ids}-name-error`} className={errorClass}>
                    {errors.name}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${ids}-email`} className={labelClass}>
                  {t("form.email")}
                </label>
                <input
                  id={`${ids}-email`}
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                    save({ email: event.target.value });
                  }}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  maxLength={255}
                  placeholder={t("form.emailPlaceholder")}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? `${ids}-email-error` : undefined}
                  className={field}
                />
                {errors.email ? (
                  <p id={`${ids}-email-error`} className={errorClass}>
                    {errors.email}
                  </p>
                ) : null}
              </div>
            </div>
          ) : identity ? (
            <p className="text-[13px] text-muted-foreground">{t("form.sentAs", { name: identity.name, email: identity.email })}</p>
          ) : null}

          {topic === "partnership" ? (
            <div className="space-y-1.5">
              <label htmlFor={`${ids}-organisation`} className={labelClass}>
                {t("form.organisation")}
              </label>
              <input
                id={`${ids}-organisation`}
                value={organisation}
                onChange={(event) => {
                  setOrganisation(event.target.value);
                  save({ organisation: event.target.value });
                }}
                autoComplete="organization"
                enterKeyHint="next"
                maxLength={160}
                placeholder={t("form.organisationPlaceholder")}
                className={field}
              />
            </div>
          ) : null}

          {topic === "website" ? (
            <div className="space-y-1.5">
              <label htmlFor={`${ids}-page`} className={labelClass}>
                {t("form.page")}
              </label>
              <input id={`${ids}-page`} value={page} onChange={(event) => setPage(event.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" maxLength={500} className={field} />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`${ids}-body`} className={labelClass}>
                {t("form.message")}
              </label>
              {restored ? <span className="text-[12px] text-muted-foreground">{t("form.draftRestored")}</span> : null}
            </div>
            <AutoTextarea
              id={`${ids}-body`}
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                if (errors.body) setErrors({ ...errors, body: undefined });
                save({ body: event.target.value });
              }}
              minRows={5}
              maxRows={14}
              maxLength={5000}
              placeholder={t("form.messagePlaceholder")}
              aria-invalid={errors.body ? true : undefined}
              aria-describedby={`${ids}-body-hint`}
              className={cn(field, "h-auto py-3 leading-6 lg:h-auto")}
            />
            <div id={`${ids}-body-hint`} className="flex items-start justify-between gap-3 text-[12px]">
              <span className={errors.body ? "text-destructive" : "text-muted-foreground"}>
                {errors.body ?? (remaining > 0 && body.trim() ? t("form.tooShort", { count: remaining }) : "")}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{t("form.chars", { count: body.length })}</span>
            </div>
          </div>

          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {t.rich("form.privacy", {
              link: (chunks) => (
                <Link href="/confidentialite" className="underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </Link>
              ),
            })}
          </p>

          {failure ? (
            <p id={`${ids}-failure`} role="alert" className="rounded-[10px] border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-[14px] text-destructive">
              {failure}
            </p>
          ) : null}

          {/* Phones: stuck to the bottom of the screen, and above the keyboard while typing. */}
          <div
            style={keyboard ? { bottom: keyboard } : undefined}
            className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
          >
            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-psg-blue px-6 font-wide text-[11px] font-semibold tracking-[0.06em] text-white uppercase shadow-brand transition-[opacity,transform] active:scale-[0.99] disabled:opacity-60 sm:w-auto dark:bg-white dark:text-psg-blue"
            >
              {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {sending ? t("form.sending") : failure ? t("form.errors.retry") : t("form.send")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

type Help = { text: Parameters<ReturnType<typeof useTranslations<"Contact">>>[0]; cta?: { href: string; label: Parameters<ReturnType<typeof useTranslations<"Contact">>>[0] } };

/** What to say (and where to send) before the form, per topic. */
function helpFor(topic: ContactTopic, view: "visitor" | "member"): Help {
  switch (topic) {
    case "join":
      return { text: "help.join", cta: { href: "/adhesion", label: "help.joinCta" } };
    case "events":
      return view === "member" ? { text: "help.eventsMember", cta: { href: "/evenements", label: "help.eventsMemberCta" } } : { text: "help.eventsVisitor" };
    case "fees":
      return { text: "help.fees", cta: { href: "/cotisation", label: "help.feesCta" } };
    case "account":
      return view === "member" ? { text: "help.account", cta: { href: "/parametres/confidentialite", label: "help.accountCta" } } : { text: "help.accountVisitor" };
    case "website":
      return { text: "help.website" };
    case "partnership":
      return { text: "help.partnership" };
    default:
      return { text: "help.other" };
  }
}
