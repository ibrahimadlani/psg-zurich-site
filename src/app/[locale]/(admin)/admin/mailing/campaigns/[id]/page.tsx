import { desc, eq, gte } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CampaignSettings } from "@/components/mailing/campaign-settings";
import { TemplateEditor } from "@/components/mailing/template-editor";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { emailCampaigns, events } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { requireMailingAdmin, savedTemplates } from "@/lib/mailing/admin-data";
import { recentEventsSince } from "@/lib/mailing/time";
import { AdminSkeleton } from "@/components/skeletons";

// Campaign ids exist at runtime only: rendered at request time.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Mailing");
  return { title: t("title"), robots: { index: false } };
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const [t, format] = await Promise.all([getTranslations("Mailing"), getFormatter()]);
  if (!(await requireMailingAdmin())) return <p className="text-destructive">{t("error")}</p>;
  const { id } = await params;
  const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
  if (!campaign) notFound();
  const [saved, eventRows] = await Promise.all([
    savedTemplates("campaign", id),
    db.select({ id: events.id, title: events.title, startsAt: events.startsAt }).from(events).where(gte(events.startsAt, recentEventsSince())).orderBy(desc(events.startsAt)),
  ]);
  const locked = campaign.status === "sending" || campaign.status === "sent";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
        <Badge variant="outline">{t(`campaigns.status.${campaign.status}`)}</Badge>
      </header>
      <section className="rounded-[14px] border bg-card p-5 shadow-brand">
        <CampaignSettings
          campaign={{ ...campaign, scheduledAt: campaign.scheduledAt?.toISOString() ?? null }}
          events={eventRows.map((event) => ({
            id: event.id,
            label: `${event.title} — ${format.dateTime(event.startsAt, { dateStyle: "medium" })}`,
          }))}
        />
      </section>
      <section className="space-y-3">
        <h2 className="font-wide text-xs font-semibold tracking-[0.08em] uppercase">{t("campaigns.textsTitle")}</h2>
        <TemplateEditor ownerType="campaign" ownerId={id} saved={saved} variables={[]} readOnly={locked} />
      </section>
    </div>
  );
}

export default async function CampaignPage({ params }: PageProps<"/[locale]/admin/mailing/campaigns/[id]">) {
  const t = await getTranslations("Mailing");
  return (
    <>
      <Link href="/admin/mailing?onglet=campagnes" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        {t("back")}
      </Link>
      <Suspense fallback={<AdminSkeleton cards={2} />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}
