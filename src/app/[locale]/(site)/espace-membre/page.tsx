import { ArrowRight, LayoutDashboard, MessagesSquare, Settings } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MemberCard } from "@/components/member-area/member-card";
import { MyPredictions } from "@/components/member-area/my-predictions";
import { ClubDocuments } from "@/components/member-area/club-documents";
import { MemberPolls } from "@/components/member-area/member-polls";
import { MyRegistrations } from "@/components/member-area/my-registrations";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { unreadThreadIds } from "@/lib/contact";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";
import { memberPolls } from "@/lib/polls";
import { hasRole } from "@/lib/roles";
import { MemberAreaSkeleton } from "@/components/skeletons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MemberArea");
  return { title: t("title"), robots: { index: false } };
}

/** Life as a member: card, predictions, polls, my events, the club's documents. Account settings live in /parametres. */
async function MemberPanel() {
  const t = await getTranslations("MemberArea");
  const tNav = await getTranslations("Nav");
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale: await getLocale() });

  const { user } = session;
  const member = await getCurrentMember();
  // Committee replies the member hasn't opened yet: red count on "My messages".
  const unread = member ? (await unreadThreadIds(member.id)).size : 0;
  const name = member ? `${member.firstName} ${member.lastName}` : user.name || user.email;

  // Signed up before the profile questions existed, or skipped them: a quiet nudge.
  const profileIncomplete = member && (member.birthDate === null || member.photoConsent === null);

  return (
    <div className="space-y-10">
      {profileIncomplete ? (
        <Link
          href="/bienvenue?reprendre=1"
          prefetch={false}
          className="group flex items-center gap-4 rounded-[14px] border bg-card px-5 py-4 transition-colors hover:border-foreground/30"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">{t("completeProfile.title")}</span>
            <span className="text-sm text-pretty text-muted-foreground">{t("completeProfile.body")}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : null}
      {/* The card on the left, the predictions in the room beside it; registrations below. */}
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <MemberCard member={member ?? null} name={name} />
        {member?.status === "active" ? <MyPredictions memberId={member.id} /> : null}
      </div>
      {member?.status === "active" ? <MemberPolls polls={await memberPolls(member.id)} /> : null}
      {member?.status === "active" ? <MyRegistrations memberId={member.id} /> : null}
      {member?.status === "active" ? <ClubDocuments /> : null}
      <div className="flex flex-wrap gap-2 border-t pt-6">
        <Button variant="outline" asChild>
          <Link href="/parametres" prefetch={false}>
            <Settings aria-hidden />
            {tNav("settings")}
          </Link>
        </Button>
        {member ? (
          <Button variant="outline" asChild>
            <Link href="/espace-membre/messages" prefetch={false}>
              <MessagesSquare aria-hidden />
              {t("messagesLink")}
              {unread ? (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-psg-red px-1 text-[10px] leading-none font-bold text-white tabular-nums">
                  <span className="sr-only">{t("newReplies", { count: unread })}</span>
                  <span aria-hidden>{unread > 9 ? "9+" : unread}</span>
                </span>
              ) : null}
            </Link>
          </Button>
        ) : null}
        {hasRole(user.role, "moderator") ? (
          <Button variant="outline" asChild>
            <Link href="/admin" prefetch={false}>
              <LayoutDashboard aria-hidden />
              {t("adminLink")}
            </Link>
          </Button>
        ) : null}
        <SignOutButton />
      </div>
    </div>
  );
}

export default async function MemberAreaPage() {
  const t = await getTranslations("MemberArea");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<MemberAreaSkeleton />}>
        <MemberPanel />
      </Suspense>
    </>
  );
}
