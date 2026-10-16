import { asc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddTeamMemberForm, CommitteeTitleField, TeamRoleControls } from "@/components/admin/team/team-controls";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminCard, adminLabel } from "@/components/admin/ui/styles";
import { DeploymentStatus } from "@/components/deployment-status";
import { AdminListSkeleton } from "@/components/skeletons";
import { UserAvatar } from "@/components/user-avatar";
import { db } from "@/db";
import { members, user } from "@/db/schema";
import { adminPage } from "@/lib/admin/guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminShell");
  return { title: t("sections.settings"), robots: { index: false } };
}

const ORDER = { superadmin: 0, admin: 1, moderator: 2, member: 3 } as const;

async function Settings() {
  await connection();
  const [t, tShell] = await Promise.all([getTranslations("AdminRoles"), getTranslations("AdminShell")]);
  const session = await adminPage("roles");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const team = (
    await db
      .select({ id: user.id, name: user.name, email: user.email, image: user.image, role: user.role, committeeTitle: members.committeeTitle })
      .from(user)
      .leftJoin(members, eq(members.userId, user.id))
      .where(inArray(user.role, ["moderator", "admin", "superadmin"]))
      .orderBy(asc(user.name))
  ).sort((a, b) => ORDER[a.role] - ORDER[b.role]);

  return (
    <>
      <AdminHeader title={tShell("sections.settings")} description={t("pageDescription")} />
      <section className="space-y-3" aria-labelledby="team">
        <h2 id="team" className={adminLabel}>
          {t("title")}
        </h2>
        <p className="max-w-prose text-sm text-pretty text-muted-foreground">{t("description")}</p>
        <ul className={`${adminCard} divide-y`}>
          {team.map((member) => (
            <li key={member.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <UserAvatar name={member.name} email={member.email} image={member.image} className="size-10 rounded-[10px] text-[11px]" />
                <span className="min-w-0 leading-tight">
                  <span className="flex items-center gap-2 truncate text-[15px] font-semibold">
                    {member.name || member.email}
                    {member.id === session.user.id ? <span className="text-[12px] font-normal text-muted-foreground">{t("you")}</span> : null}
                  </span>
                  <span className="block truncate text-[13px] text-muted-foreground">{member.email}</span>
                </span>
              </div>
              <CommitteeTitleField userId={member.id} title={member.committeeTitle} />
              {member.role === "superadmin" || member.id === session.user.id ? (
                <StatusPill tone="brand">{t(`roles.${member.role === "member" ? "moderator" : member.role}`)}</StatusPill>
              ) : (
                <TeamRoleControls email={member.email} role={member.role === "admin" ? "admin" : "moderator"} />
              )}
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-pretty text-muted-foreground">{t("committeeTitleHint")}</p>
        <AddTeamMemberForm />
        <dl className="grid gap-2 pt-2 text-[13px] text-muted-foreground sm:grid-cols-2">
          <div className={`${adminCard} p-3.5`}>
            <dt className="mb-1 font-semibold text-foreground">{t("roles.moderator")}</dt>
            <dd className="text-pretty">{t("rights.moderator")}</dd>
          </div>
          <div className={`${adminCard} p-3.5`}>
            <dt className="mb-1 font-semibold text-foreground">{t("roles.admin")}</dt>
            <dd className="text-pretty">{t("rights.admin")}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-10 space-y-3">
        <DeploymentStatus />
      </section>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<AdminListSkeleton rows={3} />}>
      <Settings />
    </Suspense>
  );
}
