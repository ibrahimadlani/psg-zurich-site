import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { NewPollButton, PollActions } from "@/components/admin/polls/poll-admin";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminCard } from "@/components/admin/ui/styles";
import { PollResults } from "@/components/polls/poll-results";
import { AdminListSkeleton } from "@/components/skeletons";
import { adminPage } from "@/lib/admin/guard";
import { adminPolls } from "@/lib/polls";
import { cn } from "@/lib/utils";
import { Streamed } from "@/components/ui/streamed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminShell");
  return { title: t("sections.polls"), robots: { index: false } };
}

async function Polls() {
  await connection();
  const [t, format] = await Promise.all([getTranslations("AdminPolls"), getFormatter()]);
  const session = await adminPage("polls");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const polls = await adminPolls();

  return polls.length ? (
    <ul className="grid gap-3 lg:grid-cols-2">
      {polls.map((poll) => (
        <li key={poll.id} className={cn(adminCard, "flex flex-col gap-4 p-4 lg:p-5", poll.status === "closed" && "opacity-85")}>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill tone={poll.votingOpen ? "ok" : poll.status === "draft" ? "neutral" : "warn"}>
              {t(poll.votingOpen ? "status.live" : poll.status === "draft" ? "status.draft" : poll.status === "open" ? "status.scheduled" : "status.closed")}
            </StatusPill>
            <span className="text-[12px] text-muted-foreground">
              {poll.closesAt
                ? t("until", { date: format.dateTime(poll.closesAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })
                : t("createdOn", { date: format.dateTime(poll.createdAt, { day: "numeric", month: "short" }) })}
            </span>
          </div>
          <div className="space-y-1">
            <h2 className="font-narrow text-[26px] leading-[0.95] font-extrabold text-balance uppercase italic">{poll.question}</h2>
            {poll.description ? <p className="text-[14px] text-pretty text-muted-foreground">{poll.description}</p> : null}
          </div>
          <PollResults options={poll.options} total={poll.total} votesLabel={(count) => t("votes", { count })} />
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <span className="text-[13px] text-muted-foreground">{t("total", { count: poll.total })}</span>
            <PollActions id={poll.id} status={poll.status} question={poll.question} />
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <p className="rounded-[14px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
  );
}

export default async function AdminPollsPage() {
  const [t, tShell] = await Promise.all([getTranslations("AdminPolls"), getTranslations("AdminShell")]);
  return (
    <>
      <AdminHeader title={tShell("sections.polls")} description={t("description")} actions={<NewPollButton />} />
      <Streamed fallback={<AdminListSkeleton rows={3} />}>
        <Polls />
      </Streamed>
    </>
  );
}
