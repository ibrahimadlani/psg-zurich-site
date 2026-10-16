import { eq } from "drizzle-orm";
import { ArrowLeft, Building2, Globe, Link2 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminComposer } from "@/components/admin/messages/admin-composer";
import { ThreadActionsBar } from "@/components/admin/messages/thread-actions";
import { AdminForbidden } from "@/components/admin/ui/admin-header";
import { StatusPill, type PillTone } from "@/components/admin/ui/status-pill";
import { Conversation, type Bubble } from "@/components/contact/conversation";
import { AdminDetailSkeleton } from "@/components/skeletons";
import { UserAvatar } from "@/components/user-avatar";
import { db } from "@/db";
import { contactThreads, type ContactStatus } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { adminPage } from "@/lib/admin/guard";
import { inboxDetail } from "@/lib/admin/messages-query";
import { formatReference } from "@/lib/contact";
import { isDuesPaid } from "@/lib/dues";
import { hasRole } from "@/lib/roles";

// Conversations only exist at runtime.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminMessages");
  return { title: t("title"), robots: { index: false } };
}

const TONE: Record<ContactStatus, PillTone> = { new: "danger", open: "warn", answered: "ok", closed: "neutral", spam: "neutral" };

async function ThreadDetail({ id }: { id: string }) {
  await connection();
  const [t, tTopics] = await Promise.all([getTranslations("AdminMessages"), getTranslations("ContactTopics")]);
  const session = await adminPage("messages");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const detail = await inboxDetail(id, session.user.role);
  if (!detail) notFound();
  const { thread, messages, member, team } = detail;

  // Opened by the committee: no longer "new" (the badge and the bell go down).
  if (thread.status === "new") await db.update(contactThreads).set({ status: "open" }).where(eq(contactThreads.id, id));

  // Ready answers, in the sender's language.
  const tTemplates = await getTranslations({ locale: thread.locale, namespace: "ContactTemplates" });
  const firstName = thread.name.split(/\s+/)[0] ?? thread.name;
  const wrap = (text: string) => `${tTemplates("greeting", { name: firstName })}\n\n${text}\n\n${tTemplates("signature")}`;
  const templates = [
    { key: "topic", label: tTopics(`${thread.topic}.label`), text: wrap(tTemplates(thread.topic)) },
    { key: "thanks", label: t("templateList.thanks"), text: wrap(tTemplates("thanks")) },
  ];

  const bubbles: Bubble[] = messages.map((message) =>
    message.author === "contact"
      ? { id: message.id, side: "theirs", author: thread.name, email: thread.email, image: member?.image, body: message.body, at: message.createdAt }
      : {
          id: message.id,
          side: message.author === "note" ? "note" : "mine",
          author: `${message.authorName || message.authorEmail || t("you")}${message.author === "note" ? ` · ${t("note")}` : ""}`,
          email: message.authorEmail,
          image: message.authorImage,
          body: message.body,
          at: message.createdAt,
        },
  );
  const reference = formatReference(thread.reference);
  const status = thread.status === "new" ? "open" : thread.status;

  return (
    <article className="flex min-h-[calc(100svh-12rem)] flex-col gap-6">
      <Link href="/admin/messages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:hidden">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>

      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <UserAvatar name={thread.name} email={thread.email} image={member?.image} className="size-12 rounded-[12px] text-sm" />
          <div className="min-w-0 flex-1">
            <h1 className="font-narrow text-[28px] leading-none font-extrabold break-words uppercase italic">{thread.name}</h1>
            <p className="mt-1 truncate text-[14px] text-muted-foreground">{thread.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={TONE[status]}>{t(`statuses.${status}`)}</StatusPill>
          <StatusPill>{tTopics(`${thread.topic}.label`)}</StatusPill>
          <StatusPill className="font-mono">{reference}</StatusPill>
          <StatusPill>
            <Globe aria-hidden />
            {t("writtenIn", { language: t(`languages.${thread.locale}`) })}
          </StatusPill>
        </div>
        {thread.organisation || thread.context?.page || member ? (
          <ul className="space-y-1.5 text-[14px]">
            {thread.organisation ? (
              <li className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="size-4 shrink-0" aria-hidden />
                <span className="text-foreground">{thread.organisation}</span>
              </li>
            ) : null}
            {thread.context?.page ? (
              <li className="flex items-center gap-2 text-muted-foreground">
                <Link2 className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{t("context", { page: thread.context.page })}</span>
              </li>
            ) : null}
            {member ? (
              <li>
                <Link href={`/admin/membres/${member.id}`} prefetch={false} className="inline-flex items-center gap-2 rounded-[10px] border bg-card px-3 py-2 text-[13px] transition-colors hover:border-foreground/30">
                  <span className="font-semibold">{t("memberFile")}</span>
                  <span className="text-muted-foreground">{t("memberStatus", { number: member.memberNumber ?? "—", paid: isDuesPaid(member) ? "yes" : "no" })}</span>
                </Link>
              </li>
            ) : null}
          </ul>
        ) : null}
        <ThreadActionsBar
          id={thread.id}
          reference={reference}
          email={thread.email}
          status={thread.status}
          assignedToId={thread.assignedToId}
          team={team}
          canDelete={hasRole(session.user.role, "admin")}
        />
      </header>

      <Conversation bubbles={bubbles} className="flex-1 border-t pt-6" />

      {thread.status !== "spam" ? <AdminComposer key={thread.id} id={thread.id} name={firstName} email={thread.email} templates={templates} /> : null}
    </article>
  );
}

export default async function MessageDetailPage({ params }: PageProps<"/[locale]/admin/messages/[id]">) {
  const { id } = await params;
  return (
    <Suspense fallback={<AdminDetailSkeleton />}>
      <ThreadDetail id={id} />
    </Suspense>
  );
}
