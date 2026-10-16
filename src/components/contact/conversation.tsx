import { useFormatter } from "next-intl";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

export type Bubble = {
  id: string;
  /** "mine": the reader's side (right) · "theirs": the other side (left) · "note": internal to the committee. */
  side: "mine" | "theirs" | "note";
  author: string;
  email?: string | null;
  image?: string | null;
  body: string;
  at: Date;
};

/**
 * A conversation as chat bubbles: the reader's own messages on the right, the other side on the
 * left, the committee's internal notes on a yellow background. Line breaks are kept.
 */
export function Conversation({ bubbles, className }: { bubbles: Bubble[]; className?: string }) {
  const format = useFormatter();
  return (
    <ol className={cn("flex flex-col gap-4", className)}>
      {bubbles.map((bubble) => (
        <li key={bubble.id} className={cn("flex items-end gap-2.5", bubble.side === "mine" && "flex-row-reverse")}>
          <UserAvatar name={bubble.author} email={bubble.email ?? bubble.author} image={bubble.image} className="size-8 rounded-full text-[10px]" />
          <div className={cn("flex max-w-[min(34rem,85%)] min-w-0 flex-col gap-1", bubble.side === "mine" && "items-end")}>
            <span className="px-1 text-[12px] text-muted-foreground">
              <span className="font-semibold text-foreground">{bubble.author}</span> · {format.dateTime(bubble.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            <div
              className={cn(
                "rounded-[16px] px-4 py-3 text-[15px] leading-relaxed break-words whitespace-pre-line",
                bubble.side === "mine" && "rounded-br-[6px] bg-psg-blue text-white dark:bg-white dark:text-psg-blue",
                bubble.side === "theirs" && "rounded-bl-[6px] border bg-card",
                bubble.side === "note" && "rounded-bl-[6px] border border-amber-500/30 bg-amber-400/15 text-foreground",
              )}
            >
              {bubble.body}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
