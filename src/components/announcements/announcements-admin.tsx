import { desc } from "drizzle-orm";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminLabel } from "@/components/admin/ui/styles";
import { AnnouncementActions } from "@/components/announcements/announcement-actions";
import { BANNER_TONES } from "@/components/announcements/banner-tones";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { cn } from "@/lib/utils";

/** The banners, the live one first: each as it looks on the site, with its state and dates. */
export async function AnnouncementsAdmin() {
  const [t, format, now] = await Promise.all([getTranslations("AdminBanner"), getFormatter(), getNow()]);
  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(30);
  const withStatus = rows
    .map((row) => {
      const expired = row.endsAt !== null && row.endsAt <= now;
      return { row, expired, status: row.active && !expired ? ("live" as const) : expired ? ("expired" as const) : ("off" as const) };
    })
    .sort((a, b) => Number(b.status === "live") - Number(a.status === "live"));
  const live = withStatus.filter((item) => item.status === "live");
  const others = withStatus.filter((item) => item.status !== "live");

  const list = (items: typeof withStatus) => (
    <ul className="space-y-2">
      {items.map(({ row, expired, status }) => (
        <li key={row.id} className={cn("space-y-3 rounded-[14px] border bg-card p-3.5", status !== "live" && "opacity-80")}>
          <div className={cn("rounded-[8px] px-3 py-1.5 text-center text-[13px] leading-5", BANNER_TONES[row.tone])}>
            <strong className="font-semibold">{row.titleFr}</strong>
            <span className="opacity-85"> · {row.messageFr}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={status === "live" ? "ok" : "neutral"}>{t(`status.${status}`)}</StatusPill>
            <StatusPill>{t(`tones.${row.tone}`)}</StatusPill>
            {row.titleDe || row.titleEn ? <StatusPill>{[row.titleDe ? "DE" : null, row.titleEn ? "EN" : null].filter(Boolean).join(" · ")}</StatusPill> : null}
            <span className="min-w-0 flex-1 text-[12px] text-muted-foreground">
              {format.dateTime(row.createdAt, { dateStyle: "medium", timeStyle: "short" })}
              {row.endsAt ? ` → ${format.dateTime(row.endsAt, { dateStyle: "medium", timeStyle: "short" })}` : ""}
            </span>
            <AnnouncementActions id={row.id} active={row.active} expired={expired} />
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className={adminLabel}>{t("liveTitle")}</h2>
        {live.length ? list(live) : <p className="rounded-[14px] border border-dashed p-6 text-center text-sm text-muted-foreground">{t("noneLive")}</p>}
      </section>
      {others.length ? (
        <section className="space-y-3">
          <h2 className={adminLabel}>{t("historyTitle")}</h2>
          {list(others)}
        </section>
      ) : null}
    </div>
  );
}
