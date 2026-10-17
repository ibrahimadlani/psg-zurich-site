import { ArrowRight, Info, Lock, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { EventCard } from "@/components/events/event-card";
import { MatchRow } from "@/components/matches/match-row";
import { RichText } from "@/components/news/rich-text";
import type { Block } from "@/lib/article-blocks";
import type { EventView } from "@/lib/events";
import type { Match } from "@/lib/matches";
import { Link } from "@/i18n/navigation";
import type { EVENT_TYPES } from "@/db/schema";
import { cn } from "@/lib/utils";

export type BlockRefs = { matches: Map<string, Match>; events: Map<string, EventView> };

const mediaUrl = (id: string) => `/api/v1/media/${id}`;
const caption = "text-center text-[13px] leading-snug text-muted-foreground";

/** Event block for non-members: its kind only, and a way to the events showcase. */
function EventTeaser({ type }: { type: (typeof EVENT_TYPES)[number] }) {
  const t = useTranslations("Events");
  return (
    <Link
      href="/events"
      className="group flex items-center gap-3 rounded-[12px] border bg-card/70 p-4 text-sm transition-colors hover:border-foreground/25"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/5 text-muted-foreground">
        <Lock className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t(`types.${type}`)}</span>
        <span className="block text-muted-foreground">{t("teaser")}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function BlockView({ block, refs, eventsOpen }: { block: Block; refs: BlockRefs; eventsOpen: boolean }) {
  switch (block.type) {
    case "paragraph":
      return block.text.trim() ? (
        <p className="text-[17px] leading-[1.7] text-pretty sm:text-lg">
          <RichText text={block.text} />
        </p>
      ) : null;
    case "heading":
      return <h2 className="-mb-1.5 mt-[18px] text-2xl leading-tight font-semibold text-balance">{block.text}</h2>;
    case "quote":
      return (
        <figure className="my-4 flex flex-col gap-3.5 border-y py-7">
          <blockquote className="font-narrow text-[length:clamp(26px,3.4vw,34px)] leading-[1.1] font-bold text-balance italic">
            « {block.text} »
          </blockquote>
          {block.cite ? (
            <figcaption className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {block.cite}
            </figcaption>
          ) : null}
        </figure>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List
          className={cn(
            "flex flex-col gap-2 pl-6 text-[17px] leading-[1.6] sm:text-lg",
            block.ordered ? "list-decimal marker:font-semibold marker:text-psg-red" : "list-disc marker:text-psg-red",
          )}
        >
          {block.items.map((item, index) => (
            <li key={index} className="pl-1">
              <RichText text={item} />
            </li>
          ))}
        </List>
      );
    }
    case "divider":
      return (
        <div aria-hidden className="my-3 flex justify-center gap-2">
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="size-1 rounded-full bg-foreground/30" />
          ))}
        </div>
      );
    case "image":
      return block.mediaId ? (
        <figure className="flex flex-col gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded media, already resized */}
          <img src={mediaUrl(block.mediaId)} alt={block.alt} loading="lazy" className="w-full rounded-[12px] bg-card" />
          {block.caption ? <figcaption className={caption}>{block.caption}</figcaption> : null}
        </figure>
      ) : null;
    case "gallery":
      return (
        <figure className="flex flex-col gap-2.5">
          <div className={cn("grid gap-2", block.images.length === 2 || block.images.length === 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
            {block.images.map((image) => (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded media, already resized
              <img
                key={image.mediaId}
                src={mediaUrl(image.mediaId)}
                alt={image.alt}
                loading="lazy"
                className="aspect-square w-full rounded-[10px] bg-card object-cover"
              />
            ))}
          </div>
          {block.caption ? <figcaption className={caption}>{block.caption}</figcaption> : null}
        </figure>
      );
    case "callout": {
      const important = block.tone === "important";
      const Icon = important ? TriangleAlert : Info;
      return (
        <aside
          className={cn(
            "flex gap-3 rounded-[12px] border px-4 py-3.5 text-[15px] leading-relaxed",
            important ? "border-psg-red/30 bg-psg-red/[0.06]" : "border-psg-blue/25 bg-psg-blue/[0.05] dark:border-foreground/20 dark:bg-foreground/5",
          )}
        >
          <Icon className={cn("mt-0.5 size-4 shrink-0", important ? "text-psg-red" : "text-psg-blue dark:text-foreground")} aria-hidden />
          <p className="text-pretty">
            <RichText text={block.text} />
          </p>
        </aside>
      );
    }
    case "video":
      return (
        <figure className="flex flex-col gap-2.5">
          <div className="aspect-video w-full overflow-hidden rounded-[12px] bg-card">
            {/* youtube-nocookie: no tracking cookie until the visitor plays the video. */}
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${block.youtubeId}`}
              title={block.caption || "YouTube"}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="size-full border-0"
            />
          </div>
          {block.caption ? <figcaption className={caption}>{block.caption}</figcaption> : null}
        </figure>
      );
    case "match": {
      const match = refs.matches.get(block.matchId);
      return match ? <MatchRow match={match} /> : null;
    }
    case "event": {
      const event = refs.events.get(block.eventId);
      if (!event) return null;
      // Events are for members whose fee is paid: everyone else sees a pointer to the showcase.
      return eventsOpen ? <EventCard event={event} access="member" /> : <EventTeaser type={event.type} />;
    }
  }
}

/** Article body in the reading column (blocks referencing missing data are skipped). */
export function ArticleBody({ blocks, refs, eventsOpen }: { blocks: Block[]; refs: BlockRefs; eventsOpen: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-[40rem] flex-col gap-[22px]">
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} refs={refs} eventsOpen={eventsOpen} />
      ))}
    </div>
  );
}
