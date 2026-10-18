import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { MembersList } from "@/components/admin/members/members-list";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { MasterDetail } from "@/components/admin/ui/master-detail";
import { AdminListSkeleton } from "@/components/skeletons";
import { adminPage } from "@/lib/admin/guard";
import { listMembers } from "@/lib/admin/members-query";
import { can } from "@/lib/roles";
import { Streamed } from "@/components/ui/streamed";

/** The member list stays on the left (search and filters kept) while members open on the right. */
async function MembersFrame({ children }: { children: React.ReactNode }) {
  await connection();
  const t = await getTranslations("AdminMembers");
  const session = await adminPage("members.read");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const rows = await listMembers();
  return (
    <MasterDetail
      list={
        <>
          <AdminHeader title={t("title")} className="mb-5 lg:mb-6" />
          <MembersList rows={rows} canExport={can(session.user.role, "members.write")} />
        </>
      }
    >
      {children}
    </MasterDetail>
  );
}

export default function MembersLayout({ children }: LayoutProps<"/[locale]/admin/members">) {
  return (
    <Streamed fallback={<AdminListSkeleton />}>
      <MembersFrame>{children}</MembersFrame>
    </Streamed>
  );
}
