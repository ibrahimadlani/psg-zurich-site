import { ArrowLeft, ChevronRight, PenLine } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { formatReference, memberThreads, unreadThreadIds } from "@/lib/contact";
import { getCurrentMember } from "@/lib/members";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { getSession } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { MessagesSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ContactThread");
  return { title: t("listTitle"), robots: { index: false } };
}

const tone = {
  new: "bg-foreground/[0.06] text-muted-foreground",
  open: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  answered: "bg-emerald-600/12 text-emerald-700 dark:text-emerald-400",
  closed: "bg-foreground/[0.06] text-muted-foreground",
  spam: "bg-foreground/[0.06] text-muted-foreground",
} as const;

async function Threads() {
  await connection();
  const [t, tTopics, format] = await Promise.all([getTranslations("ContactThread"), getTranslations("ContactTopics"), getFormatter()]);
  const session = await getSession();
  if (!session) return redirectToSignIn();
  const member = await getCurrentMember();
  const [all, unread] = member ? await Promise.all([memberThreads(member.id), unreadThreadIds(member.id)]) : [[], new Set<string>()];
  const threads = all.filter((thread) => thread.status !== "spam");
  return (
    <div className="space-y-4">
      {threads.length ? (
        <ul className="divide-y overflow-hidden rounded-[14px] border bg-card">
          {threads.map((thread) => {
            const status = thread.status === "spam" ? "closed" : thread.status;
            return (
              <li key={thread.id}>
                <Link href={`/member/messages/${thread.id}`} prefetch={false} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03]">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-[15px] font-semibold">{tTopics(`${thread.topic}.label`)}</span>
                      {unread.has(thread.id) ? (
                        <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-psg-red px-2 text-[11px] font-bold text-white">{t("newReply")}</span>
                      ) : null}
                    </span>
                    <span className="block text-[12px] text-muted-foreground">
                      <span className="font-mono">{formatReference(thread.reference)}</span> · {format.dateTime(thread.lastMessageAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                  <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-medium", tone[status])}>{t(`statuses.${status}`)}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-[14px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      )}
      <Link href="/contact" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-psg-blue px-5 font-wide text-[11px] font-semibold tracking-[0.06em] text-white uppercase sm:w-auto dark:bg-white dark:text-psg-blue">
        <PenLine className="size-4" aria-hidden />
        {t("write")}
      </Link>
    </div>
  );
}

/** My conversations with the committee, newest first. */
export default async function MemberMessagesPage() {
  const [t, tArea] = await Promise.all([getTranslations("ContactThread"), getTranslations("MemberArea")]);
  return (
    <div className="space-y-6">
      <Link href="/member" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {tArea("title")}
      </Link>
      <PageHeader title={t("listTitle")} description={t("listDescription")} />
      <Streamed fallback={<MessagesSkeleton />}>
        <Threads />
      </Streamed>
    </div>
  );
}
