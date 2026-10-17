import { getFormatter, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventsAdminList } from "@/components/admin/events/events-admin-list";
import { NewEventButton } from "@/components/admin/events/event-panel";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { MasterDetail } from "@/components/admin/ui/master-detail";
import { AdminListSkeleton } from "@/components/skeletons";
import { adminPage } from "@/lib/admin/guard";
import { listAdminEvents, matchOptions } from "@/lib/admin/events-query";

/** The events on the left (what is coming, what happened), the one opened on the right. */
async function EventsFrame({ children }: { children: React.ReactNode }) {
  await connection();
  const [t, format] = await Promise.all([getTranslations("AdminShell"), getFormatter()]);
  const session = await adminPage("events");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const [rows, options] = await Promise.all([listAdminEvents(), matchOptions((date) => format.dateTime(date, { day: "numeric", month: "short" }))]);
  return (
    <MasterDetail
      list={
        <>
          <AdminHeader title={t("sections.events")} className="mb-5 sm:flex-col sm:items-start lg:mb-6" actions={<NewEventButton matchOptions={options} />} />
          <EventsAdminList rows={rows} />
        </>
      }
    >
      {children}
    </MasterDetail>
  );
}

export default function AdminEventsLayout({ children }: LayoutProps<"/[locale]/admin/events">) {
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <EventsFrame>{children}</EventsFrame>
    </Suspense>
  );
}
