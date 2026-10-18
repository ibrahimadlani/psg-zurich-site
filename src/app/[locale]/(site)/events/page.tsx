import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { EventDetail } from "@/components/events/event-detail";
import { EventsShowcase } from "@/components/events/events-showcase";
import { PageHeader } from "@/components/page-header";
import { EventDetailSkeleton } from "@/components/skeletons";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eventAccess } from "@/lib/dues";
import { upcomingEvents } from "@/lib/events";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";
import { asc } from "drizzle-orm";
import { RETURN_PARAM, safeReturnPath } from "@/lib/return-to";
import { Streamed } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Events");
  return { title: t("title"), description: t("description") };
}

/**
 * Members whose fee is paid: the list is in the layout; here, on a computer, the next event
 * opens on the right. Everyone else: the illustrated showcase.
 */
async function EventsContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const t = await getTranslations("Events");
  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  const access = eventAccess(Boolean(session), member);
  if (access !== "full") {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        {/* Sent here from an event's page: signing in leads back to that event. */}
        <EventsShowcase access={access} next={safeReturnPath((await searchParams)[RETURN_PARAM]) ?? undefined} />
      </>
    );
  }
  const [next] = await db.select({ id: events.id }).from(events).where(upcomingEvents()).orderBy(asc(events.startsAt)).limit(1);
  return next ? (
    <Streamed fallback={<EventDetailSkeleton />}>
      <EventDetail id={next.id} />
    </Streamed>
  ) : null;
}

export default function EventsPage({ searchParams }: PageProps<"/[locale]/events">) {
  return (
    <Streamed fallback={<EventDetailSkeleton />}>
      <EventsContent searchParams={searchParams} />
    </Streamed>
  );
}
