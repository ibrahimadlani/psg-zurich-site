import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { attendance, events } from "@/db/schema";
import { Link } from "@/i18n/navigation";

/** Upcoming events I'm registered for, or waiting for a place. */
export async function MyRegistrations({ memberId }: { memberId: string }) {
  const [t, tEvents, format] = await Promise.all([getTranslations("MemberArea"), getTranslations("Events"), getFormatter()]);
  const rows = await db
    .select({ id: events.id, title: events.title, type: events.type, startsAt: events.startsAt, status: attendance.status })
    .from(attendance)
    .innerJoin(events, eq(events.id, attendance.eventId))
    .where(
      and(
        eq(attendance.memberId, memberId),
        inArray(attendance.status, ["registered", "waitlisted"]),
        gte(events.startsAt, new Date()),
      ),
    )
    .orderBy(asc(events.startsAt));

  return (
    <section className="space-y-3">
      <h2 className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{t("registrations.title")}</h2>
      {rows.length > 0 ? (
        <ul className="divide-y overflow-hidden rounded-[12px] border bg-card/70">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/evenements/${row.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{row.title}</span>
                  <span className="block text-xs text-muted-foreground first-letter:uppercase">
                    {tEvents(`types.${row.type}`)} · {format.dateTime(row.startsAt, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
                <Badge variant={row.status === "registered" ? "default" : "secondary"}>
                  {tEvents(row.status === "registered" ? "registered" : "waitlisted")}
                </Badge>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[12px] border border-dashed p-5 text-sm text-muted-foreground">
          {t("registrations.empty")}{" "}
          <Link href="/evenements" className="text-foreground underline underline-offset-2">
            {t("registrations.browse")}
          </Link>
        </p>
      )}
    </section>
  );
}
