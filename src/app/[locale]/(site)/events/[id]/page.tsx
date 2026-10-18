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
import { getCurrentMember } from "@/lib/members";
import { Streamed } from "@/components/ui/streamed";

// Event ids only exist at runtime: rendered on the server at navigation time (like match pages).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/events/[id]">): Promise<Metadata> {
  // Events are for members only: no title for anyone else, never indexed.
  const member = await getCurrentMember();
  if (!isDuesPaid(member)) return { robots: { index: false } };
  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, (await params).id));
  return { title: event?.title, robots: { index: false } };
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
