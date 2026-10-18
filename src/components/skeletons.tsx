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

/** The big italic title of a page (News, Shop…), with the line under it. */
const PageTitleSkeleton = ({ intro = true }: { intro?: boolean }) => (
  <div className="flex flex-col gap-3.5">
    <Skeleton className="h-[clamp(40px,8vw,78px)] w-[min(22rem,80vw)] rounded-[10px]" />
    {intro ? <Line w="min(26rem, 85%)" /> : null}
  </div>
);

/** The small uppercase label above a block ("Upcoming matches", "Live"…). */
const Label = ({ w = "7rem" }: { w?: string }) => <Line w={w} className="h-2.5" />;

/* Matches ---------------------------------------------------------------------- */

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

/** Compact league table beside the fixtures (rank, crest, club, J, Diff., Pts). */
function StandingsSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="divide-y overflow-hidden rounded-[12px] border bg-card/70">
      {times(rows).map((index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-2.5">
          <Line w="1rem" className="h-3" />
          <Skeleton className="size-5 rounded-full" />
          <Line w={`${46 - (index % 4) * 7}%`} className="h-3" />
          <Line w="1.5rem" className="ml-auto h-3" />
          <Line w="1.5rem" className="h-3" />
        </div>
      ))}
    </div>
  );
}

/**
 * /matches: the featured match, then the fixtures with the league table beside them on a
 * computer (tabs, filters, "Expand"); on a phone, the two tab groups over the list.
 */
export function MatchesSkeleton() {
  return (
    <SkeletonGroup className="space-y-8">
      <div className="space-y-2.5">
        <Label w="6rem" />
        <ScoreboardSkeleton />
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <TabsSkeleton count={2} />
            <div className="ml-auto flex gap-4 max-lg:hidden">
              <Line w="3.5rem" />
              <Line w="3rem" />
            </div>
            <div className="ml-auto lg:hidden">
              <TabsSkeleton count={2} />
            </div>
          </div>
          <div className="space-y-2.5">
            <Label w="8rem" />
            {times(5).map((index) => (
              <MatchRowSkeleton key={index} />
            ))}
          </div>
        </div>
        <div className="hidden space-y-4 lg:block">
          <div className="flex items-center justify-between gap-2">
            <TabsSkeleton count={2} />
            <Line w="4.5rem" />
          </div>
          <div className="space-y-2.5">
            <Label w="9rem" />
            <StandingsSkeleton />
          </div>
        </div>
      </div>
    </SkeletonGroup>
  );
}

/** /matches/[id]: score card, calendar link, then facts beside prediction and match sheet. */
export function MatchDetailSkeleton() {
  return (
    <SkeletonGroup className="space-y-6">
      <ScoreboardSkeleton />
      <Line w="9rem" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="order-2 space-y-8 lg:order-1">
          {times(2).map((index) => (
            <div key={index} className="space-y-3">
              <Label w="8rem" />
              <Skeleton className="h-44 w-full rounded-[14px]" />
            </div>
          ))}
        </div>
        <div className="order-1 space-y-8 lg:order-2">
          <div className="space-y-3">
            <Label w="6rem" />
            <Skeleton className="h-52 w-full rounded-[14px]" />
          </div>
          <div className="space-y-3">
            <Label w="7rem" />
            <Skeleton className="h-40 w-full rounded-[14px]" />
          </div>
        </div>
      </div>
    </SkeletonGroup>
  );
}

/** Rows of a ranking table (predictions leaderboard): tabs, then the table. */
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

/* Events ----------------------------------------------------------------------- */

/** The open event: badges, big title, the facts rows, a section. */
function EventBodySkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-[22px] w-20 rounded-full" />
          <Label w="6rem" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-[clamp(30px,6vw,54px)] w-11/12 rounded-[10px]" />
          <Skeleton className="h-[clamp(30px,6vw,54px)] w-1/2 rounded-[10px]" />
        </div>
      </div>
      <div className="border-t">
        {times(4).map((index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 border-b py-4 sm:grid-cols-[96px_minmax(0,1fr)_auto]">
            <Label w="3.5rem" />
            <Line w={`${60 - (index % 2) * 20}%`} className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Label w="5rem" />
        <Skeleton className="h-28 w-full max-w-xl rounded-[14px]" />
      </div>
    </div>
  );
}

/**
 * /events (members): the list beside the open event on a computer, the list alone on a phone —
 * like the real page.
 */
export function EventsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonGroup className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,2fr)] lg:gap-x-5">
      <div className="flex flex-col gap-2.5">
        {times(count).map((index) => (
          <div key={index} className="flex items-center gap-3.5 rounded-[12px] border bg-card/70 p-3.5">
            <div className="flex w-11 shrink-0 flex-col items-center gap-1.5">
              <Line w="70%" className="h-2.5" />
              <Skeleton className="h-7 w-8 rounded-[6px]" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Line w="35%" className="h-2.5" />
              <Line w={`${80 - (index % 3) * 12}%`} className="h-4" />
              <Line w="55%" className="h-3" />
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden className="hidden w-px self-stretch bg-border lg:block" />
      <div className="max-lg:hidden">
        <EventBodySkeleton />
      </div>
    </SkeletonGroup>
  );
}

/** /events/[id] (and the next event on /events): the open event. */
export function EventDetailSkeleton() {
  return (
    <SkeletonGroup className="mt-[clamp(24px,4vw,36px)] lg:mt-0">
      <EventBodySkeleton />
    </SkeletonGroup>
  );
}

/* News ------------------------------------------------------------------------- */

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

/** /news: title, category tabs, featured article, grid. */
export function NewsListSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <PageTitleSkeleton />
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

/** /news/[slug]: meta, big title, excerpt, cover, paragraphs. */
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

/* Member area -------------------------------------------------------------------- */

/** /member: member card with predictions beside it, then registrations. */
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
      {/* The links at the bottom (settings, messages, payments, orders…). */}
      <div className="flex flex-wrap gap-2 border-t pt-6">
        {times(5).map((index) => (
          <Skeleton key={index} className="h-9 w-28 rounded-[8px]" />
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

/** /member/messages: my conversations (topic, reference and date, status). */
export function MessagesSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <SkeletonGroup className="space-y-4">
      <div className="divide-y overflow-hidden rounded-[14px] border bg-card">
        {times(rows).map((index) => (
          <div key={index} className="flex min-h-16 items-center gap-3 px-4 py-3">
            <div className="flex-1 space-y-1.5">
              <Line w={`${42 - (index % 3) * 8}%`} className="h-4" />
              <Line w="9rem" className="h-3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-[10px] sm:w-44" />
    </SkeletonGroup>
  );
}

/** One conversation (member area or tracking link): title, status, bubbles, reply box. */
export function ThreadSkeleton() {
  return (
    <SkeletonGroup className="flex min-h-[60svh] flex-col gap-6">
      <div className="space-y-2">
        <Label w="6rem" />
        <Skeleton className="h-[clamp(32px,7vw,48px)] w-[min(20rem,75%)] rounded-[10px]" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="flex flex-1 flex-col gap-4">
        {(["theirs", "mine", "theirs"] as const).map((side, index) => (
          <div key={index} className={cn("flex items-end gap-2.5", side === "mine" && "flex-row-reverse")}>
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className={cn("h-20 rounded-[16px]", index === 1 ? "w-[min(22rem,70%)]" : "w-[min(28rem,80%)]")} />
          </div>
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-[14px]" />
    </SkeletonGroup>
  );
}

/** /member/orders: one card per order (reference, total, timeline, pieces). */
export function OrdersSkeleton({ count = 2 }: { count?: number }) {
  return (
    <SkeletonGroup className="flex flex-col gap-4">
      {times(count).map((index) => (
        <div key={index} className="flex flex-col gap-5 rounded-[16px] border bg-card p-4 shadow-brand sm:p-6">
          <div className="space-y-2">
            <Label w="10rem" />
            <Skeleton className="h-6 w-24 rounded-[8px]" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {times(3).map((step) => (
              <div key={step} className="flex flex-col items-center gap-1.5">
                <Skeleton className="size-7 rounded-full" />
                <Line w="60%" className="h-2.5" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 border-t pt-4">
            <Skeleton className="size-12 shrink-0 rounded-[10px]" />
            <div className="flex-1 space-y-1.5">
              <Line w="45%" />
              <Line w="2rem" className="h-3" />
            </div>
            <Line w="3.5rem" />
          </div>
          <Skeleton className="h-11 w-full rounded-[12px]" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** /member/payments: one card per payment (reference, what, amount, documents). */
export function PaymentsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonGroup className="flex flex-col gap-3">
      {times(count).map((index) => (
        <div key={index} className="flex flex-col gap-3 rounded-[14px] border bg-card p-4 shadow-brand sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Label w="9rem" />
              <Line w={`${55 - (index % 2) * 15}%`} className="h-4" />
              <Line w="8rem" className="h-3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-[8px]" />
          </div>
          <div className="flex gap-2 border-t pt-3">
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}

/* Shop ------------------------------------------------------------------------- */

/** The collection grid: 4:5 photos, name and price, sizes. */
function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-3 lg:gap-y-12">
      {times(count).map((index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-[4/5] w-full rounded-[14px]" />
          <div className="flex flex-col gap-1.5 px-0.5 sm:flex-row sm:justify-between">
            <Line w="60%" />
            <Line w="3.5rem" />
          </div>
          <Line w="5rem" className="h-3" />
        </div>
      ))}
    </div>
  );
}

/** /shop, below its title: the count and sort bar, then the collection. */
export function ShopCollectionSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 border-y py-3">
        <Line w="5rem" className="h-3" />
        <div className="flex gap-1.5">
          {times(3).map((index) => (
            <Skeleton key={index} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <ProductGridSkeleton />
    </SkeletonGroup>
  );
}

/** The shop while its access is checked: the whole collection page. */
export function ShopSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <PageTitleSkeleton />
      <ProductGridSkeleton count={3} />
    </SkeletonGroup>
  );
}

/** /shop/[slug]: the gallery, and beside it the name, price, sizes and buttons. */
export function ProductSkeleton() {
  return (
    <SkeletonGroup className="grid items-start gap-[clamp(24px,4vw,56px)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <Skeleton className="-mx-4 aspect-[4/5] rounded-none lg:mx-0 lg:rounded-[16px]" />
        <div className="hidden gap-3 lg:flex">
          {times(4).map((index) => (
            <Skeleton key={index} className="size-16 rounded-[10px]" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <Line w="9rem" className="h-3" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[clamp(36px,6vw,56px)] w-11/12 rounded-[10px]" />
          <Skeleton className="h-6 w-24 rounded-[8px]" />
        </div>
        <div className="flex flex-wrap gap-2">
          {times(4).map((index) => (
            <Skeleton key={index} className="h-12 w-14 rounded-[10px]" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Skeleton className="h-12 w-[7.5rem] rounded-[10px]" />
            <Skeleton className="h-12 flex-1 rounded-[10px]" />
          </div>
          <Skeleton className="h-12 w-full rounded-[10px]" />
        </div>
        <div className="divide-y border-y">
          {times(3).map((index) => (
            <div key={index} className="py-4">
              <Line w="8rem" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonGroup>
  );
}

/** /checkout: title, numbered steps, and the order summary beside them on a computer. */
export function CheckoutSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-6">
      <Skeleton className="h-[clamp(40px,8vw,64px)] w-[min(18rem,70%)] rounded-[10px]" />
      <Skeleton className="h-[52px] w-full rounded-[14px] lg:hidden" />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
        <div className="flex flex-col">
          {[16, 36, 20].map((height, index) => (
            <div key={index} className="flex gap-4 pb-8">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-4 pt-1">
                <Line w="8rem" className="h-3" />
                <Skeleton className="w-full rounded-[12px]" style={{ height: `${height * 4}px` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden space-y-4 rounded-[16px] border bg-card p-6 lg:block">
          {times(2).map((index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-[10px]" />
              <Line w="50%" />
              <Line w="3rem" className="ml-auto" />
            </div>
          ))}
          <div className="space-y-2.5 border-t pt-4">
            <Line w="100%" className="h-3" />
            <Line w="100%" className="h-3" />
            <Line w="100%" className="h-4" />
          </div>
          <Skeleton className="h-12 w-full rounded-[10px]" />
        </div>
      </div>
    </SkeletonGroup>
  );
}

/* Contact & home ---------------------------------------------------------------- */

/** A card of the contact aside (email, Instagram): round icon, two lines. */
const ContactCardSkeleton = () => (
  <div className="flex items-center gap-3 rounded-[14px] border bg-card p-4 shadow-brand">
    <Skeleton className="size-10 shrink-0 rounded-full" />
    <div className="flex-1 space-y-2">
      <Line w="75%" className="h-4" />
      <Line w="90%" className="h-3" />
      <Line w="45%" className="h-3" />
    </div>
  </div>
);

/** The small uppercase title of a contact block ("Pick a subject", "By email"…). */
const ContactTitle = ({ w }: { w: string }) => <Line w={w} className="h-3" />;

/**
 * /contact: the header (title, intro, reply-time chip), then the six subject tiles and the
 * questions on the left; email, Instagram, the committee and the map on the right.
 */
export function ContactSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <div className="flex flex-col gap-3.5">
        <Skeleton className="h-[clamp(39px,7.9vw,77px)] w-[min(16rem,70%)] rounded-[10px]" />
        {/* The intro runs over two lines (three on a phone). */}
        <div className="max-w-[36rem] space-y-2.5">
          <Line className="h-4" />
          <Line w="55%" className="h-4" />
          <Line w="40%" className="h-4 sm:hidden" />
        </div>
        <Skeleton className="h-7 w-36 rounded-full" />
      </div>

      <div className="grid items-start gap-[clamp(28px,4vw,40px)] lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-[clamp(28px,4vw,40px)]">
          <div className="space-y-3">
            <ContactTitle w="9rem" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              {times(6).map((index) => (
                <div key={index} className="flex min-h-[88px] flex-col items-start gap-2 rounded-[14px] border bg-card p-3.5 sm:min-h-[96px]">
                  <Skeleton className="size-8 rounded-full" />
                  <Line w={`${75 - (index % 3) * 12}%`} className="h-4" />
                  {/* The hint, two short lines, from sm. */}
                  <div className="hidden w-full space-y-1.5 sm:block">
                    <Line w="90%" className="h-3" />
                    <Line w="60%" className="h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <ContactTitle w="11rem" />
            <div className="divide-y overflow-hidden rounded-[14px] border bg-card">
              {times(6).map((index) => (
                <div key={index} className="flex min-h-14 items-center gap-3 px-4 py-3">
                  <Line w={`${68 - (index % 3) * 14}%`} className="h-4" />
                  <Skeleton className="ml-auto size-4 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-[clamp(24px,3vw,32px)]">
          <div className="flex flex-col gap-3">
            <ContactTitle w="6rem" />
            <ContactCardSkeleton />
          </div>
          <div className="flex flex-col gap-3">
            <ContactTitle w="7rem" />
            <ContactCardSkeleton />
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <ContactTitle w="6rem" />
              <Line w="80%" className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
              {times(4).map((index) => (
                <div key={index} className="flex items-center gap-2.5 rounded-[12px] border bg-card p-2.5">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Line w="70%" />
                    <Line w="50%" className="h-2.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/3] rounded-[14px] sm:aspect-[16/9] lg:aspect-[4/3]" />
            <div className="flex items-center justify-between px-1">
              <Line w="7rem" />
              <Line w="6rem" />
            </div>
          </div>
        </div>
      </div>
    </SkeletonGroup>
  );
}

/** The site's diagonal lines over the blue panels (same as the landing's). */
const hatching = "[background-image:repeating-linear-gradient(135deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_14px)]";
/** A light shape on the blue hero. */
const LightLine = ({ w = "100%", className }: { w?: string; className?: string }) => (
  <Skeleton className={cn("skeleton-light h-3.5 rounded-full", className)} style={{ width: w }} />
);

/**
 * The visitors' landing while it loads: the blue hero already in place (title, lead, buttons,
 * the skyline's outline), the red band, then the association's block — the real page's sizes.
 */
export function LandingSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-[clamp(80px,12vw,140px)] overflow-x-clip pt-[clamp(12px,2.5vw,24px)]">
      <div className="flex flex-col">
        <div className={cn("relative mx-2 overflow-hidden rounded-[24px] bg-psg-blue shadow-brand sm:mx-4 sm:rounded-[32px]", hatching)}>
          <div className="mx-auto grid w-full max-w-5xl items-end gap-4 px-4 pt-[clamp(32px,5vw,64px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
            <div className="flex flex-col gap-6 lg:pb-[clamp(56px,6vw,80px)]">
              <Skeleton className="skeleton-light h-[30px] w-60 rounded-full" />
              {/* The three lines of "Ici c'est Paris. À Zurich." */}
              <div className="flex flex-col gap-[clamp(6px,1vw,10px)]">
                {["82%", "62%", "88%"].map((w) => (
                  <Skeleton key={w} className="skeleton-light h-[clamp(44px,7.4vw,92px)] rounded-[12px]" style={{ width: w }} />
                ))}
              </div>
              {/* The lead: four lines on a computer, five on a phone. */}
              <div className="max-w-[30rem] space-y-3">
                <LightLine className="h-4" />
                <LightLine w="94%" className="h-4" />
                <LightLine w="97%" className="h-4" />
                <LightLine w="88%" className="h-4 sm:hidden" />
                <LightLine w="22%" className="h-4" />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="h-12 rounded-[10px] bg-white/85 sm:w-36" />
                <Skeleton className="skeleton-light h-12 rounded-[10px] sm:w-56" />
              </div>
              <div className="space-y-2">
                <LightLine w="16rem" className="h-3" />
                <LightLine w="10rem" className="h-3 sm:hidden" />
              </div>
            </div>
            {/* The skyline: moon, town and quay, as faint shapes. */}
            <div className="relative -mx-4 aspect-[600/520] sm:mx-0">
              <span className="absolute top-[12%] right-[16%] size-[13%] rounded-full bg-white/15" />
              <span className="absolute inset-x-[4%] bottom-[30%] h-[20%] rounded-t-[10px] bg-white/[0.07] [clip-path:polygon(0_60%,10%_40%,20%_55%,32%_20%,40%_45%,52%_0,60%_35%,70%_10%,80%_40%,90%_25%,100%_45%,100%_100%,0_100%)]" />
            </div>
          </div>
          {/* The quay, across the whole panel, as on the real hero. */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[clamp(24px,3vw,40px)] bg-black/25" />
        </div>
        {/* The red band, like the shirt's (its words come with the page). */}
        <div aria-hidden className="relative -mt-5 overflow-hidden py-6">
          <div className="-mx-8 h-[60px] -rotate-[1.6deg] border-y-[5px] border-white bg-psg-red/90 dark:border-white/90" />
        </div>
      </div>

      {/* The association: kicker, title, text and values beside the crest on the lake. */}
      <div className="mx-auto grid w-full max-w-5xl items-center gap-12 px-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <Line w="7rem" className="h-3" />
            <div className="space-y-2">
              {/* "Plus qu'un club de supporters.": three lines on a computer, two on a phone. */}
              {["90%", "70%", "84%"].map((w, index) => (
                <Skeleton key={w} className={cn("h-[clamp(36px,6.2vw,68px)] rounded-[10px]", index === 2 && "hidden lg:block")} style={{ width: w }} />
              ))}
            </div>
          </div>
          <div className="space-y-2.5">
            {["100%", "96%", "88%", "100%", "92%", "60%"].map((w, index) => (
              <Line key={index} w={w} className="h-4" />
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            {times(3).map((index) => (
              <div key={index} className="flex items-center gap-4 rounded-[16px] border bg-card p-4 shadow-brand">
                <Skeleton className="size-11 shrink-0 rounded-[12px]" />
                <div className="flex-1 space-y-2">
                  <Line w="6rem" className="h-4" />
                  <Line w="85%" className="h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="aspect-square w-full rounded-[28px]" />
      </div>
    </SkeletonGroup>
  );
}

/** The members' home while it loads: greeting, then the match and event beside prediction and rank. */
export function MemberHomeSkeleton() {
  return (
    <SkeletonGroup className="mx-auto flex w-full max-w-5xl flex-col gap-[clamp(32px,5vw,48px)] px-4 py-10">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[clamp(36px,7vw,68px)] w-[min(26rem,85%)] rounded-[10px]" />
        <Line w="18rem" />
      </div>
      <div className="grid items-start gap-[clamp(24px,4vw,36px)] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-9">
          <div className="space-y-3">
            <Label w="7rem" />
            <ScoreboardSkeleton />
          </div>
          <div className="space-y-3">
            <Label w="8rem" />
            <Skeleton className="h-44 w-full rounded-[16px]" />
          </div>
        </div>
        <div className="flex flex-col gap-9">
          <div className="space-y-3">
            <Label w="6rem" />
            <Skeleton className="h-52 w-full rounded-[16px]" />
          </div>
          <div className="space-y-3">
            <Label w="7rem" />
            <Skeleton className="h-40 w-full rounded-[16px]" />
          </div>
        </div>
      </div>
    </SkeletonGroup>
  );
}

/** /admin/audience: period chips, tabs, the six figures, the big chart, two lists. */
export function AudienceSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {times(5).map((index) => (
            <Skeleton key={index} className="h-9 w-20 rounded-full lg:h-8" />
          ))}
        </div>
        <Skeleton className="h-8 w-48 rounded-full" />
      </div>
      <div className="flex gap-6 border-b pb-3">
        {times(5).map((index) => (
          <Line key={index} w="5rem" className="h-3" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        {times(6).map((index) => (
          <div key={index} className="flex flex-col gap-2.5 rounded-[14px] border bg-card p-4 lg:p-5">
            <Line w="6rem" className="h-2.5" />
            <Skeleton className="h-9 w-20 rounded-[8px]" />
            <Skeleton className="h-7 w-full rounded-[6px]" />
            <Line w="4rem" className="h-3" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-[14px] border bg-card p-4 lg:p-5">
        <Line w="7rem" className="h-2.5" />
        <Skeleton className="h-[220px] w-full rounded-[10px] sm:h-[260px]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
        {times(2).map((card) => (
          <div key={card} className="flex flex-col gap-2 rounded-[14px] border bg-card p-4 lg:p-5">
            <Line w="8rem" className="h-2.5" />
            {times(5).map((index) => (
              <Skeleton key={index} className="h-10 rounded-[8px]" style={{ width: `${90 - index * 14}%` }} />
            ))}
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

/* Admin ------------------------------------------------------------------------ */

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
