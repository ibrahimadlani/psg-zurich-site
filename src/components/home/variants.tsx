import { getTranslations } from "next-intl/server";
import {
  type Basics,
  BlockTitle,
  CommunitySplit,
  EventBlock,
  type Extras,
  Feed,
  Greeting,
  MatchStage,
  NewsStrip,
  PredictBlock,
  RankBlock,
  SinceLastVisit,
  TodoList,
  card,
  eyebrow,
  predictionAccess,
} from "@/components/home/blocks";
import type { HomeViewer } from "@/lib/home";
import { cn } from "@/lib/utils";

type MemberProps = { basics: Basics; viewer: HomeViewer; extras: Extras };

/* Members --------------------------------------------------------------------- */

const firstName = (viewer: HomeViewer) => viewer.member?.firstName ?? viewer.session?.user.name?.split(" ")[0] ?? "";

/** M1 "Dashboard": everything at a glance — news since last time, predict, sign up, rank, read. */
export async function MemberDashboard({ basics, viewer, extras }: MemberProps) {
  return (
    <div className="flex flex-col gap-[clamp(32px,5vw,48px)]">
      <Greeting name={firstName(viewer)}>
        <SinceLastVisit extras={extras} />
      </Greeting>
      {/* Two columns on a computer; on a phone one, in the order that matters: the match, then
          its prediction, then the event, the rank, the to-dos. */}
      <div className="flex flex-col gap-[clamp(24px,4vw,36px)] lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-9">
          <div className="order-1 min-w-0">
            <MatchStage basics={basics} />
          </div>
          <div className="order-3 min-w-0">
            <EventBlock event={basics.event} participants={basics.participants} access={viewer.access} memberId={viewer.member?.id ?? null} />
          </div>
        </div>
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-9">
          <div className="order-2 min-w-0">
            <PredictBlock match={basics.next} access={predictionAccess(viewer)} memberId={viewer.member?.id ?? null} />
          </div>
          <div className="order-4 min-w-0">
            <RankBlock extras={extras} />
          </div>
          {extras.todo.length ? (
            <div className="order-5 min-w-0">
              <TodoList extras={extras} />
            </div>
          ) : null}
        </div>
      </div>
      <NewsStrip posts={basics.news} />
    </div>
  );
}

/** M2 "Feed": one column for the thumb — what is left to do, then everything new, newest first. */
export async function MemberFeed({ basics, viewer, extras }: MemberProps) {
  const t = await getTranslations("Home");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <Greeting name={firstName(viewer)}>
        <p className="text-[15px] text-muted-foreground">{extras.unread.length ? t("feedLead", { count: extras.unread.length }) : t("upToDate")}</p>
      </Greeting>
      <TodoList extras={extras} />
      {basics.live.length || basics.next ? <MatchStage basics={basics} /> : null}
      <Feed extras={extras} />
      <NewsStrip posts={basics.news} count={2} title={t("toRead")} />
    </div>
  );
}

/** M3 "Matchday": the match at the centre — predict it, see the club's split, watch it together. */
export async function MemberMatchday({ basics, viewer, extras }: MemberProps) {
  const t = await getTranslations("Home");
  const memberId = viewer.member?.id ?? null;
  return (
    <div className="flex flex-col gap-[clamp(32px,6vw,56px)]">
      <section className="flex flex-col gap-5">
        <p className={cn(eyebrow, "text-center")}>{t("greetShort", { name: firstName(viewer) })}</p>
        <MatchStage basics={basics} big />
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <PredictBlock match={basics.next} access={predictionAccess(viewer)} memberId={memberId} />
          <div className="flex flex-col gap-5">
            {basics.stats?.total ? (
              <section className="space-y-3">
                <BlockTitle title={t("communityTitle")} />
                <div className={cn(card, "p-5")}>
                  <CommunitySplit stats={basics.stats} />
                </div>
              </section>
            ) : null}
            <RankBlock extras={extras} compact />
          </div>
        </div>
      </section>
      <EventBlock
        event={basics.matchEvent ?? basics.event}
        participants={basics.matchEvent ? basics.matchParticipants : basics.participants}
        access={viewer.access}
        memberId={memberId}
        title={basics.matchEvent ? t("watchThisMatch") : undefined}
      />
      <NewsStrip posts={basics.news} />
    </div>
  );
}
