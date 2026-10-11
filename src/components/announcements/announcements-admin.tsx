import { desc } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { AnnouncementActions } from "@/components/announcements/announcement-actions";
import { AnnouncementForm } from "@/components/announcements/announcement-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { announcements } from "@/db/schema";

export async function AnnouncementsAdmin() {
  const [t, format] = await Promise.all([getTranslations("AdminBanner"), getFormatter()]);
  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(20);
  const now = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AnnouncementForm />
        {rows.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {rows.map((row) => {
              const expired = row.endsAt !== null && row.endsAt <= now;
              const status = row.active && !expired ? "live" : expired ? "expired" : "off";
              return (
                <li key={row.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={status === "live" ? "default" : "outline"}>{t(`status.${status}`)}</Badge>
                      <Badge variant="secondary">{t(`tones.${row.tone}`)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format.dateTime(row.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                        {row.endsAt
                          ? ` → ${format.dateTime(row.endsAt, { dateStyle: "medium", timeStyle: "short" })}`
                          : ""}
                      </span>
                    </div>
                    <p className="truncate text-sm">
                      <strong className="font-semibold">{row.titleFr}</strong>
                      <span className="text-muted-foreground"> · {row.messageFr}</span>
                    </p>
                  </div>
                  <AnnouncementActions id={row.id} active={row.active} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        )}
      </CardContent>
    </Card>
  );
}
