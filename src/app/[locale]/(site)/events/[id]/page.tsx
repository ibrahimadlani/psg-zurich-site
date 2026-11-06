import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EventDetail } from "@/components/events/event-detail";
import { EventDetailSkeleton } from "@/components/skeletons";
import { db } from "@/db";
import { events } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { isDuesPaid } from "@/lib/dues";
import { eventIsOver, publicEvent } from "@/lib/events";
import { pageMetadata } from "@/lib/seo";
import { getCurrentMember } from "@/lib/members";
import { Streamed } from "@/components/ui/streamed";

// Event ids only exist at runtime: rendered on the server at navigation time (like match pages).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/events/[id]">): Promise<Metadata> {
  const { id } = await params;
  const member = await getCurrentMember();
  if (isDuesPaid(member)) {
    const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, id));
    return { title: event?.title, robots: { index: false } };
  }
  // Others only see what the committee made public, and search engines only until it has passed.
  const open = await publicEvent(id);
  if (!open) return { robots: { index: false } };
  const t = await getTranslations("PublicEvent");
  const metadata = await pageMetadata({ path: `/events/${id}`, title: open.title, description: t(`teaser.${open.type}`) });
  return eventIsOver(open) ? { ...metadata, robots: { index: false } } : metadata;
}

export default async function EventPage({ params }: PageProps<"/[locale]/events/[id]">) {
  const t = await getTranslations("Events");
  const { id } = await params;
  return (
    <div>
      {/* Phones only: on a computer the list stays on the left. */}
      {/* Same discreet label as "Prochain événement" in the list. */}
      <Link
        href="/events"
        className="inline-flex items-center gap-2 font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:text-foreground lg:hidden"
      >
        <ArrowLeft className="size-3" aria-hidden />
        {t("backToEvents")}
      </Link>
      <Streamed fallback={<EventDetailSkeleton />}>
        <EventDetail id={id} />
      </Streamed>
    </div>
  );
}
