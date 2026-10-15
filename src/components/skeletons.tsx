import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Loading placeholders shaped like the pages they stand in for (same widths, radii and
 * spacing), so the real content lands without the layout jumping.
 */

const times = (count: number) => Array.from({ length: count }, (_, index) => index);

/** A line of text: `w` is its width (the last line of a paragraph is shorter). */
const Line = ({ w = "100%", className }: { w?: string; className?: string }) => (
  <Skeleton className={cn("h-3.5 rounded-full", className)} style={{ width: w }} />
);

/** Match list row (date · two teams · action). */
export function MatchRowSkeleton() {
  return (
    <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-[10px] border bg-card/60 p-3 sm:grid-cols-[6rem_1fr_auto] sm:gap-5 sm:p-4">
      <div className="space-y-1.5">
        <Line w="70%" />
        <Line w="45%" />
      </div>
      <div className="space-y-2">
        <Line w="40%" className="h-3" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-full" />
          <Line w="45%" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-full" />
          <Line w="38%" />
        </div>
      </div>
      <Skeleton className="size-8 rounded-full" />
    </div>
  );
}

/** Big score card of the featured match. */
function ScoreboardSkeleton() {
  return (
    <div className="space-y-6 rounded-[14px] border bg-card/70 p-5 sm:p-7">
      <Line w="30%" className="h-3" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-14 rounded-full sm:size-16" />
          <Line w="60%" />
        </div>
        <Skeleton className="h-12 w-28 rounded-[10px] sm:h-14 sm:w-36" />
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-14 rounded-full sm:size-16" />
          <Line w="60%" />
        </div>
      </div>
    </div>
  );
}

const TabsSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="inline-flex gap-1 rounded-[9px] border bg-card/60 p-1">
    {times(count).map((index) => (
      <Skeleton key={index} className="h-7 w-20 rounded-[6px]" />
    ))}
  </div>
);

/** /matchs: featured match, tabs, list. */
export function MatchesSkeleton() {
  return (
    <SkeletonGroup className="space-y-8">
      <div className="space-y-2.5">
        <Line w="6rem" className="h-2.5" />
        <ScoreboardSkeleton />
      </div>
      <div className="space-y-4">
        {/* Two groups, like the real bar: fixtures on the left, league tables on the right. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsSkeleton count={2} />
          <TabsSkeleton count={2} />
        </div>
        <div className="space-y-2.5">
          {times(5).map((index) => (
            <MatchRowSkeleton key={index} />
          ))}
        </div>
      </div>
    </SkeletonGroup>
  );
}

/** /matchs/[id]: score card, details line, two sections. */
export function MatchDetailSkeleton() {
  return (
    <SkeletonGroup className="space-y-8">
      <ScoreboardSkeleton />
      <div className="flex flex-wrap gap-4">
        <Line w="9rem" />
        <Line w="7rem" />
        <Line w="8rem" />
      </div>
      {times(2).map((index) => (
        <div key={index} className="space-y-3">
          <Line w="8rem" className="h-3" />
          <Skeleton className="h-24 w-full rounded-[12px]" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** Rows of a ranking table. */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <SkeletonGroup className="space-y-4">
      <TabsSkeleton count={2} />
      <div className="divide-y overflow-hidden rounded-[12px] border bg-card/70">
        {times(rows).map((index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="size-5 rounded-full" />
            <Line w={`${40 - (index % 3) * 8}%`} />
            <Line w="2.5rem" className="ml-auto" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

/** Event list: stacked cards. */
export function EventsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonGroup className="space-y-3">
      {times(count).map((index) => (
        <div key={index} className="flex flex-col gap-4 rounded-[12px] border bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Line w="55%" className="h-4" />
            <Line w="40%" />
          </div>
          <Skeleton className="h-9 w-32 rounded-[8px]" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** /evenements/[id]: title block, facts, map card. */
export function EventDetailSkeleton() {
  return (
    <SkeletonGroup className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-10 w-3/4 rounded-[10px]" />
        <div className="space-y-2">
          <Line />
          <Line w="92%" />
          <Line w="60%" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-[14px]" />
        <Skeleton className="h-11 w-full rounded-[8px]" />
      </div>
    </SkeletonGroup>
  );
}

/** News card: picture, category, title, excerpt. */
function NewsCardSkeleton() {
  return (
    <div className="space-y-3.5">
      <Skeleton className="aspect-[16/10] w-full rounded-[12px]" />
      <Line w="35%" className="h-2.5" />
      <Skeleton className="h-6 w-11/12 rounded-[8px]" />
      <div className="space-y-2">
        <Line />
        <Line w="70%" />
      </div>
    </div>
  );
}

/** /actualites: title, category tabs, featured article, grid. */
export function NewsListSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="space-y-3.5">
          <Skeleton className="h-[clamp(44px,9vw,80px)] w-[min(22rem,80vw)] rounded-[10px]" />
          <Line w="16rem" />
        </div>
        <div className="flex gap-1.5">
          {times(4).map((index) => (
            <Skeleton key={index} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <Skeleton className="aspect-video w-full rounded-[14px]" />
        <div className="space-y-4">
          <Line w="30%" className="h-2.5" />
          <Skeleton className="h-9 w-11/12 rounded-[10px]" />
          <Skeleton className="h-9 w-3/4 rounded-[10px]" />
          <div className="space-y-2">
            <Line />
            <Line w="80%" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-x-6 gap-y-10">
        {times(3).map((index) => (
          <NewsCardSkeleton key={index} />
        ))}
      </div>
    </SkeletonGroup>
  );
}

/** /actualites/[slug]: meta, big title, excerpt, cover, paragraphs. */
export function ArticleSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-5">
        <Line w="7rem" />
        <div className="mt-2 flex gap-2.5">
          <Skeleton className="h-[22px] w-20 rounded-full" />
          <Line w="9rem" className="self-center" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-[clamp(34px,6.4vw,64px)] w-full rounded-[10px]" />
          <Skeleton className="h-[clamp(34px,6.4vw,64px)] w-2/3 rounded-[10px]" />
        </div>
        <div className="space-y-2.5">
          <Line className="h-4" />
          <Line w="75%" className="h-4" />
        </div>
        <div className="flex items-center gap-2.5 border-t pt-5">
          <Skeleton className="size-8 rounded-full" />
          <Line w="8rem" />
        </div>
      </div>
      <Skeleton className="aspect-video w-full rounded-[14px]" />
      <div className="mx-auto w-full max-w-[44rem] space-y-2.5">
        {["100%", "96%", "88%", "100%", "64%"].map((w, index) => (
          <Line key={index} w={w} />
        ))}
      </div>
    </SkeletonGroup>
  );
}

/** /espace-membre: member card with predictions beside it, then registrations. */
export function MemberAreaSkeleton() {
  return (
    <SkeletonGroup className="space-y-10">
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="aspect-[1.586] w-full max-w-[380px] rounded-[16px]" />
          <Line w="14rem" />
        </div>
        <div className="space-y-3">
          <Line w="9rem" className="h-3" />
          {times(2).map((index) => (
            <Skeleton key={index} className="h-16 w-full rounded-[12px]" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Line w="9rem" className="h-3" />
        {times(2).map((index) => (
          <Skeleton key={index} className="h-16 w-full rounded-[12px]" />
        ))}
      </div>
    </SkeletonGroup>
  );
}

/** Settings blocks: label column + field (stacked on phones). */
export function SettingsSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <SkeletonGroup className="divide-y">
      {times(blocks).map((index) => (
        <div key={index} className="grid gap-4 py-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
          <div className="space-y-2">
            <Line w="8rem" className="h-4" />
            <Line w="11rem" className="h-3" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-[8px]" />
            <Skeleton className="h-10 w-2/3 rounded-[8px]" />
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** Admin pages: a few cards with list rows. */
export function AdminSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <SkeletonGroup className="grid gap-6">
      {times(cards).map((card) => (
        <div key={card} className="space-y-4 rounded-[14px] border bg-card p-5">
          <div className="space-y-2">
            <Line w="10rem" className="h-4" />
            <Line w="18rem" className="h-3" />
          </div>
          {times(3).map((row) => (
            <div key={row} className="flex items-center gap-3">
              <Line w={`${45 - row * 6}%`} />
              <Skeleton className="ml-auto h-8 w-20 rounded-[8px]" />
            </div>
          ))}
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** /admin: title, to-do rows beside shortcuts, then the season's figures. */
export function AdminHomeSkeleton() {
  return (
    <SkeletonGroup className="space-y-8">
      <div className="space-y-3">
        <Line w="9rem" className="h-2.5" />
        <Skeleton className="h-12 w-64 rounded-[10px]" />
        <Line w="16rem" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
        <div className="space-y-2">
          {times(3).map((index) => (
            <Skeleton key={index} className="h-[62px] w-full rounded-[12px]" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {times(4).map((index) => (
            <Skeleton key={index} className="h-20 rounded-[12px]" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {times(4).map((index) => (
          <Skeleton key={index} className="h-36 rounded-[14px]" />
        ))}
      </div>
    </SkeletonGroup>
  );
}

/** An admin list (members, fees): tabs, search, rows with avatar and status. */
export function AdminListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonGroup className="space-y-3">
      <div className="flex gap-1.5">
        {times(3).map((index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-11 w-full rounded-[8px] lg:h-9" />
      <div className="space-y-2">
        {times(rows).map((index) => (
          <div key={index} className="flex items-center gap-3 rounded-[12px] border bg-card/70 p-3">
            <Skeleton className="size-10 rounded-[10px]" />
            <div className="flex-1 space-y-1.5">
              <Line w={`${55 - (index % 3) * 10}%`} />
              <Line w="35%" className="h-3" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

/** An admin item (member…): header with avatar, actions, rows of facts. */
export function AdminDetailSkeleton() {
  return (
    <SkeletonGroup className="space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-[12px]" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-9 w-2/3 rounded-[8px]" />
          <Line w="40%" className="h-3" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32 rounded-[8px]" />
        <Skeleton className="h-9 w-24 rounded-[8px]" />
      </div>
      <div className="divide-y border-y">
        {times(5).map((index) => (
          <div key={index} className="flex gap-6 py-4">
            <Line w="5rem" className="h-3" />
            <Line w={`${50 - (index % 2) * 15}%`} />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

/** One block of text-only content (forms, small panels). */
export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonGroup className={cn("space-y-3 rounded-[14px] border bg-card p-5", className)}>
      <Line w="40%" className="h-4" />
      <Line />
      <Line w="80%" />
      <Skeleton className="mt-2 h-10 w-36 rounded-[8px]" />
    </SkeletonGroup>
  );
}
