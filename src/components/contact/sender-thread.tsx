import { getFormatter, getTranslations } from "next-intl/server";
import { Conversation, type Bubble } from "@/components/contact/conversation";
import { ReplyComposer } from "@/components/contact/reply-composer";
import type { senderView } from "@/lib/contact";
import { formatReference } from "@/lib/contact";
import { cn } from "@/lib/utils";

type View = NonNullable<Awaited<ReturnType<typeof senderView>>>;

const statusTone = {
  new: "bg-foreground/[0.06] text-muted-foreground",
  open: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  answered: "bg-emerald-600/12 text-emerald-700 dark:text-emerald-400",
  closed: "bg-foreground/[0.06] text-muted-foreground",
} as const;

/** A conversation as its sender sees it: their messages on the right, the committee's on the left, a reply box. */
export async function SenderThread({ view, sender, token }: { view: View; sender: { name: string; email: string; image?: string | null }; token?: string }) {
  const [t, tTopics, format] = await Promise.all([getTranslations("ContactThread"), getTranslations("ContactTopics"), getFormatter()]);
  const { thread, messages } = view;
  const status = thread.status === "spam" ? "closed" : thread.status;
  const bubbles: Bubble[] = messages.map((message) =>
    message.author === "contact"
      ? { id: message.id, side: "mine", author: t("you"), email: sender.email, image: sender.image, body: message.body, at: message.createdAt }
      : { id: message.id, side: "theirs", author: message.authorName ? `${message.authorName} · ${t("committee")}` : t("committee"), email: "comite", image: "/brand/psg-crest.svg", body: message.body, at: message.createdAt },
  );
  return (
    <article className="flex min-h-[60svh] flex-col gap-6">
      <header className="space-y-2">
        <p className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {tTopics(`${thread.topic}.label`)} · {format.dateTime(thread.createdAt, { dateStyle: "long" })}
        </p>
        <h1 className="font-narrow text-[clamp(32px,7vw,48px)] leading-none font-extrabold uppercase italic">{t("title", { reference: formatReference(thread.reference) })}</h1>
        <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium", statusTone[status])}>{t(`statuses.${status}`)}</span>
        {token ? <p className="text-[13px] text-muted-foreground">{t("trackingNote")}</p> : null}
      </header>
      <Conversation bubbles={bubbles} className="flex-1" />
      {status === "closed" ? <p className="text-center text-[13px] text-muted-foreground">{t("closedNote")}</p> : null}
      <ReplyComposer threadId={token ? undefined : thread.id} token={token} />
    </article>
  );
}
