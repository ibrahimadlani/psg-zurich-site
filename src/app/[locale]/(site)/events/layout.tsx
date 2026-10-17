import { connection } from "next/server";
import { Suspense } from "react";
import { EventList } from "@/components/events/event-list";
import { EventsEmpty } from "@/components/events/events-empty";
import { EventsShell } from "@/components/events/events-shell";
import { EventsSkeleton } from "@/components/skeletons";
import { eventAccess } from "@/lib/dues";
import { getEventsWithAttendance, upcomingEvents } from "@/lib/events";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";

/**
 * Members whose fee is paid get the list beside the open event (it stays put, scroll included,
 * from one event to the next); everyone else gets the page as is (showcase, or redirect).
 */
async function EventsFrame({ children }: { children: React.ReactNode }) {
  await connection();
  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  if (eventAccess(Boolean(session), member) !== "full") return children;
  const list = await getEventsWithAttendance(upcomingEvents(), member?.id ?? null);
  return (
    <EventsShell list={<EventList events={list} />} empty={list.length === 0 ? <EventsEmpty /> : undefined}>
      {children}
    </EventsShell>
  );
}

export default function EventsLayout({ children }: LayoutProps<"/[locale]/events">) {
  return (
    <Suspense fallback={<EventsSkeleton />}>
      <EventsFrame>{children}</EventsFrame>
    </Suspense>
  );
}
