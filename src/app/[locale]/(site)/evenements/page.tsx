import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventCard } from "@/components/events/event-card";
import { PageHeader } from "@/components/page-header";
import { getEventsWithAttendance, upcomingEvents } from "@/lib/events";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Events");
  return { title: t("title"), description: t("description") };
}

async function EventsContent() {
  await connection();
  const t = await getTranslations("Events");
  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  const access = !session ? "guest" : member?.status === "active" ? "member" : "inactive";
  const all = await getEventsWithAttendance(upcomingEvents(), member?.id ?? null);
  const visible = access === "guest" ? all.filter((event) => !event.membersOnly) : all;

  return visible.length > 0 ? (
    <div className="space-y-3">
      {visible.map((event) => (
        <EventCard key={event.id} event={event} access={access} />
      ))}
    </div>
  ) : (
    <p className="rounded-[10px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
  );
}

export default async function EventsPage() {
  const t = await getTranslations("Events");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <EventsContent />
      </Suspense>
    </>
  );
}
