import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { InboxList } from "@/components/admin/messages/inbox-list";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { MasterDetail } from "@/components/admin/ui/master-detail";
import { AdminListSkeleton } from "@/components/skeletons";
import { adminPage } from "@/lib/admin/guard";
import { listInbox } from "@/lib/admin/messages-query";
import { visibleTopics } from "@/lib/contact";
import { Streamed } from "@/components/ui/streamed";

/** The inbox stays on the left (folder, filters and search kept) while conversations open on the right. */
async function MessagesFrame({ children }: { children: React.ReactNode }) {
  await connection();
  const t = await getTranslations("AdminMessages");
  const session = await adminPage("messages");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const rows = await listInbox(session.user.role);
  return (
    <MasterDetail
      list={
        <>
          <AdminHeader title={t("title")} description={t("description")} className="mb-5 lg:mb-6" />
          <InboxList rows={rows} me={session.user.id} topics={visibleTopics(session.user.role)} />
        </>
      }
    >
      {children}
    </MasterDetail>
  );
}

export default function MessagesLayout({ children }: LayoutProps<"/[locale]/admin/messages">) {
  return (
    <Streamed fallback={<AdminListSkeleton />}>
      <MessagesFrame>{children}</MessagesFrame>
    </Streamed>
  );
}
