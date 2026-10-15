import { CalendarPlus, ChevronRight, Mail, Megaphone, PenLine, ScanLine, Wallet, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { Kpi } from "@/components/admin/ui/kpi";
import { adminCard, adminLabel } from "@/components/admin/ui/styles";
import { AdminHomeSkeleton } from "@/components/skeletons";
import { Link } from "@/i18n/navigation";
import { adminCounters, audienceStats, memberStats, nextEventFill, scheduledPosts, unverifiedRequests } from "@/lib/admin/dashboard";
import { eventStats } from "@/lib/admin/events-query";
import { matchTitle } from "@/lib/matches";
import { adminPage } from "@/lib/admin/guard";
import { can, type Capability } from "@/lib/roles";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin");
  return { title: t("title"), robots: { index: false } };
}

type Task = { key: string; value: string; label: string; href: string; tone?: "urgent" };

/** One thing to do: the figure in big italics, what it is, a link straight to it. */
function TaskRow({ task }: { task: Task }) {
  return (
    <li>
      <Link
        href={task.href}
        prefetch={false}
        className="group flex items-center gap-4 rounded-[12px] border bg-card p-3.5 transition-[border-color,transform] hover:border-foreground/30 active:scale-[0.99]"
      >
        <span
          className={cn(
            "w-16 shrink-0 text-center font-narrow text-[30px] leading-none font-extrabold tabular-nums italic",
            task.tone === "urgent" ? "text-psg-red" : "text-psg-blue dark:text-foreground",
          )}
        >
          {task.value}
        </span>
        <span className="min-w-0 flex-1 text-[15px] leading-snug text-pretty">{task.label}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}

const SHORTCUTS: { key: "scanner" | "newEvent" | "newPost" | "banner" | "campaign" | "dues"; href: string; icon: LucideIcon; capability: Capability }[] = [
  { key: "scanner", href: "/admin/scanner", icon: ScanLine, capability: "scan" },
  { key: "newEvent", href: "/admin/evenements?nouveau=1", icon: CalendarPlus, capability: "events" },
  { key: "newPost", href: "/admin/actualites/nouveau", icon: PenLine, capability: "news" },
  { key: "banner", href: "/admin/banniere", icon: Megaphone, capability: "news" },
  { key: "campaign", href: "/admin/mailing?onglet=campagnes", icon: Mail, capability: "mailing" },
  { key: "dues", href: "/admin/cotisations", icon: Wallet, capability: "members.write" },
];

async function Home() {
  await connection();
  const [t, format, now] = await Promise.all([getTranslations("AdminHome"), getFormatter(), getNow()]);
  const session = await adminPage("area", "/admin");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const role = session.user.role;

  const [counters, members, nextEvent, unverified, scheduled, eventsSeason, audience] = await Promise.all([
    adminCounters(role),
    can(role, "members.read") ? memberStats() : null,
    can(role, "events") ? nextEventFill() : null,
    can(role, "members.read") ? unverifiedRequests() : 0,
    can(role, "news") ? scheduledPosts() : [],
    can(role, "events") ? eventStats() : null,
    can(role, "mailing") ? audienceStats() : null,
  ]);

  const tasks: Task[] = [];
  if (counters.requests) {
    tasks.push({ key: "requests", value: String(counters.requests), label: t("tasks.requests", { count: counters.requests }), href: "/admin/membres", tone: "urgent" });
  }
  if (counters.unpaid) {
    tasks.push({ key: "unpaid", value: String(counters.unpaid), label: t("tasks.unpaid", { count: counters.unpaid }), href: "/admin/cotisations" });
  }
  if (nextEvent && nextEvent.startsAt.getTime() - now.getTime() < 14 * 24 * 60 * 60 * 1000) {
    tasks.push({
      key: "event",
      value: nextEvent.capacity ? `${nextEvent.registered}/${nextEvent.capacity}` : String(nextEvent.registered),
      label: t("tasks.event", {
        title: nextEvent.title,
        when: format.relativeTime(nextEvent.startsAt, now),
        waitlisted: nextEvent.waitlisted,
      }),
      href: `/admin/evenements/${nextEvent.id}`,
    });
  }
  if (counters.failedEmails) {
    tasks.push({ key: "failed", value: String(counters.failedEmails), label: t("tasks.failedEmails", { count: counters.failedEmails }), href: "/admin/mailing?onglet=journal&statut=failed", tone: "urgent" });
  }
  for (const post of scheduled) {
    tasks.push({
      key: `post-${post.id}`,
      value: format.dateTime(post.publishedAt!, { day: "numeric", month: "short" }),
      label: t("tasks.scheduled", { title: post.title, time: format.dateTime(post.publishedAt!, { weekday: "long", hour: "2-digit", minute: "2-digit" }) }),
      href: `/admin/actualites/${post.id}`,
    });
  }
  if (unverified) {
    tasks.push({ key: "unverified", value: String(unverified), label: t("tasks.unverified", { count: unverified }), href: "/admin/membres" });
  }

  const shortcuts = SHORTCUTS.filter((shortcut) => can(role, shortcut.capability));
  const firstName = (session.user.name || "").split(/\s+/)[0] || session.user.email.split("@")[0] || "";
  const season = members ? `${Number(members.seasonEnd.slice(0, 4)) - 1}/${members.seasonEnd.slice(2, 4)}` : "";

  return (
    <>
      <AdminHeader
        eyebrow={format.dateTime(now, { weekday: "long", day: "numeric", month: "long" })}
        title={t("hello", { name: firstName })}
        description={tasks.length ? t("summary", { count: tasks.length }) : t("allClear")}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
        <section className="space-y-3" aria-labelledby="todo">
          <h2 id="todo" className={adminLabel}>
            {t("todo")}
          </h2>
          {tasks.length ? (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <TaskRow key={task.key} task={task} />
              ))}
            </ul>
          ) : (
            <p className={cn(adminCard, "border-dashed p-6 text-center text-sm text-muted-foreground")}>{t("nothing")}</p>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="shortcuts">
          <h2 id="shortcuts" className={adminLabel}>
            {t("shortcutsTitle")}
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {shortcuts.map(({ key, href, icon: Icon }) => (
              <li key={key}>
                <Link
                  href={href}
                  prefetch={false}
                  className="flex h-full min-h-20 flex-col justify-between gap-3 rounded-[12px] border bg-card p-3.5 transition-[border-color,transform] hover:border-foreground/30 active:scale-[0.98]"
                >
                  <Icon className="size-5 text-psg-blue dark:text-foreground" aria-hidden />
                  <span className="font-wide text-[10px] leading-snug font-semibold tracking-[0.06em] uppercase">{t(`shortcuts.${key}`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {members ? (
        <section className="mt-10 space-y-3" aria-labelledby="season">
          <h2 id="season" className={adminLabel}>
            {t("season", { season })}
          </h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <Kpi
              label={t("kpi.active")}
              value={members.active}
              points={members.series}
              hint={members.newThisMonth ? t("kpi.newThisMonth", { count: members.newThisMonth }) : t("kpi.noneThisMonth")}
            />
            <Kpi label={t("kpi.juniors")} value={members.juniors} hint={t("kpi.juniorsHint")} />
            {can(role, "members.write") ? (
              <>
                <Kpi
                  label={t("kpi.dues")}
                  value={members.active ? `${Math.round((members.paid / members.active) * 100)}%` : "—"}
                  gauge={members.active ? members.paid / members.active : 0}
                  hint={t("kpi.duesHint", { paid: members.paid, unpaid: members.active - members.paid })}
                />
                <Kpi label={t("kpi.amount")} value="—" hint={t("kpi.amountHint")} />
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {eventsSeason ? (
        <section className="mt-10 space-y-3" aria-labelledby="events-season">
          <h2 id="events-season" className={adminLabel}>
            {t("eventsTitle", { count: eventsSeason.held })}
          </h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <Kpi
              label={t("kpi.fill")}
              value={eventsSeason.fill === null ? "—" : `${Math.round(eventsSeason.fill * 100)}%`}
              gauge={eventsSeason.fill ?? 0}
              hint={t("kpi.fillHint")}
            />
            <Kpi
              label={t("kpi.presence")}
              value={eventsSeason.presence === null ? "—" : `${Math.round(eventsSeason.presence * 100)}%`}
              gauge={eventsSeason.presence ?? 0}
              hint={t("kpi.presenceHint")}
            />
            <Kpi label={t("kpi.noShows")} value={eventsSeason.presence === null ? "—" : eventsSeason.noShows} hint={t("kpi.noShowsHint")} />
            <Kpi label={t("kpi.held")} value={eventsSeason.held} hint={t("kpi.heldHint")} />
          </div>
        </section>
      ) : null}

      {audience ? (
        <section className="mt-10 space-y-3" aria-labelledby="audience">
          <h2 id="audience" className={adminLabel}>
            {t("audienceTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <Kpi label={t("kpi.subscribers")} value={audience.subscribers} hint={t("kpi.subscribersHint")} />
            <Kpi
              label={t("kpi.emails")}
              value={audience.sent}
              hint={audience.failed ? t("kpi.emailsFailed", { count: audience.failed }) : t("kpi.emailsHint")}
            />
            <Kpi label={t("kpi.articles")} value={audience.published} hint={t("kpi.articlesHint")} />
            <Kpi
              label={t("kpi.predictions")}
              value={audience.predictionShare === null ? "—" : `${Math.round(audience.predictionShare * 100)}%`}
              gauge={audience.predictionShare ?? 0}
              hint={audience.lastMatch ? t("kpi.predictionsHint", { count: audience.predicted, match: matchTitle(audience.lastMatch, "PSG") }) : t("kpi.noMatch")}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}

export default function AdminHomePage() {
  return (
    <Suspense fallback={<AdminHomeSkeleton />}>
      <Home />
    </Suspense>
  );
}
