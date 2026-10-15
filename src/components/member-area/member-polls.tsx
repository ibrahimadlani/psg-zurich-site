"use client";

import { Vote } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PollResults } from "@/components/polls/poll-results";
import type { PollView } from "@/lib/polls";
import { cn } from "@/lib/utils";

const label = "font-wide text-[10px] font-semibold tracking-[0.08em] uppercase";

/** One poll: the choices while it's open and the member hasn't voted, then the results. */
function PollCard({ initial }: { initial: PollView }) {
  const t = useTranslations("Polls");
  const format = useFormatter();
  const [poll, setPoll] = useState(initial);
  const [changing, setChanging] = useState(false);
  const [pending, startTransition] = useTransition();
  const voting = poll.votingOpen && (poll.myOption === null || changing);

  const vote = (optionId: string) =>
    startTransition(async () => {
      const response = await fetch(`/api/v1/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      if (!response.ok) return void toast.error(t("error"));
      const { data } = (await response.json()) as { data: PollView };
      setPoll(data);
      setChanging(false);
      toast.success(t("thanks"));
    });

  return (
    <article className="flex flex-col gap-4 rounded-[14px] border bg-card p-5 shadow-brand">
      <div className="flex items-center justify-between gap-3">
        <span className={cn(label, poll.votingOpen ? "text-psg-red" : "text-muted-foreground")}>{t(poll.votingOpen ? "open" : "closed")}</span>
        {poll.votingOpen && poll.closesAt ? (
          <span className="text-[12px] text-muted-foreground">{t("until", { date: format.dateTime(new Date(poll.closesAt), { weekday: "long", day: "numeric", month: "long" }) })}</span>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <h3 className="font-narrow text-[28px] leading-[0.95] font-extrabold text-balance uppercase italic">{poll.question}</h3>
        {poll.description ? <p className="text-[14px] text-pretty text-muted-foreground">{poll.description}</p> : null}
      </div>
      {voting ? (
        <div className="grid gap-2" role="group" aria-label={poll.question}>
          {poll.options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={pending}
              onClick={() => vote(option.id)}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-[10px] border bg-background px-4 py-3 text-left text-[15px] font-medium transition-[border-color,background-color,transform] hover:border-foreground/40 active:scale-[0.99] disabled:opacity-60",
                poll.myOption === option.id && "border-psg-blue bg-psg-blue/5 dark:border-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <PollResults options={poll.options} total={poll.total} myOption={poll.myOption} votesLabel={(count) => t("votes", { count })} />
      )}
      <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <span>{t("total", { count: poll.total })}</span>
        {poll.votingOpen && poll.myOption && !changing ? (
          <button type="button" onClick={() => setChanging(true)} className="cursor-pointer border-b transition-colors hover:border-psg-red hover:text-foreground">
            {t("change")}
          </button>
        ) : null}
      </div>
    </article>
  );
}

/** The club's polls in the member area: those open, and the latest results. */
export function MemberPolls({ polls }: { polls: PollView[] }) {
  const t = useTranslations("Polls");
  if (polls.length === 0) return null;
  return (
    <section className="space-y-3" aria-labelledby="polls">
      <h2 id="polls" className={cn(label, "flex items-center gap-2 text-muted-foreground")}>
        <Vote className="size-3.5" aria-hidden />
        {t("title")}
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {polls.map((poll) => (
          <PollCard key={poll.id} initial={poll} />
        ))}
      </div>
    </section>
  );
}
