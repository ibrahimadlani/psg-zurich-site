import "server-only";
import { and, count, countDistinct, desc, eq, gte, inArray, isNotNull, lt, sql, sum, max } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, apiUsage, attendance, events, matches, members, pageViews, posts, products, type Locale } from "@/db/schema";

/*
 * The figures of the admin's audience page, for a period and the one before it (to compare).
 * Days are Zurich days (the offset of today, close enough across a change of hour).
 */

export const PERIODS = ["24h", "7d", "30d", "90d", "12m"] as const;
export type Period = (typeof PERIODS)[number];

const DAY = 86_400_000;
const LENGTH: Record<Period, number> = { "24h": DAY, "7d": 7 * DAY, "30d": 30 * DAY, "90d": 90 * DAY, "12m": 365 * DAY };
/** How the chart cuts the period: by hour, by day, or by month. */
export const BUCKET: Record<Period, "hour" | "day" | "month"> = { "24h": "hour", "7d": "day", "30d": "day", "90d": "day", "12m": "month" };

export type Range = { start: Date; end: Date; period: Period; staff: boolean };

export function rangeOf(period: Period, staff: boolean, now = new Date()): { current: Range; previous: Range } {
  const end = now;
  const start = new Date(end.getTime() - LENGTH[period]);
  return { current: { start, end, period, staff }, previous: { start: new Date(start.getTime() - LENGTH[period]), end: start, period, staff } };
}

/** Minutes between UTC and Zurich today (60 or 120). */
function zurichOffsetMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", hour: "numeric", hour12: false }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  return (((hour - new Date().getUTCHours()) % 24) + 24) % 24 * 60;
}
/** A column's value as a Zurich time. */
const local = (column: unknown) => sql`date_add(${column}, interval ${zurichOffsetMinutes()} minute)`;
const dayOf = (column: unknown) => sql<string>`date_format(${local(column)}, '%Y-%m-%d')`;
const bucketOf = (column: unknown, bucket: "hour" | "day" | "month") =>
  sql<string>`date_format(${local(column)}, ${bucket === "hour" ? "%Y-%m-%d %H:00" : bucket === "day" ? "%Y-%m-%d" : "%Y-%m"})`;

/** The views counted for a range (committee left out unless asked). */
function viewsIn(range: Range) {
  return and(gte(pageViews.at, range.start), lt(pageViews.at, range.end), range.staff ? undefined : eq(pageViews.staff, false));
}

/** Unique visitors: distinct per day, added up over the days (a hash changes every day). */
async function dailyUniques(range: Range, extra?: ReturnType<typeof and>) {
  const rows = await db
    .select({ day: dayOf(pageViews.at), visitors: countDistinct(pageViews.visitor) })
    .from(pageViews)
    .where(and(viewsIn(range), extra))
    .groupBy(dayOf(pageViews.at));
  return rows.reduce((total, row) => total + Number(row.visitors), 0);
}

export async function totals(range: Range) {
  const [[row], visitors, [signups]] = await Promise.all([
    db
      .select({
        views: count(),
        visits: sql<number>`sum(${pageViews.entry})`,
        signedIn: sql<number>`sum(${pageViews.signedIn})`,
      })
      .from(pageViews)
      .where(viewsIn(range)),
    dailyUniques(range),
    db.select({ value: count() }).from(members).where(and(gte(members.createdAt, range.start), lt(members.createdAt, range.end))),
  ]);
  const views = Number(row?.views ?? 0);
  const visits = Math.max(Number(row?.visits ?? 0), visitors ? 1 : 0);
  return {
    views,
    visitors,
    visits,
    pagesPerVisit: visits ? views / visits : 0,
    signedInShare: views ? Number(row?.signedIn ?? 0) / views : 0,
    signups: Number(signups?.value ?? 0),
    conversion: visitors ? Number(signups?.value ?? 0) / visitors : 0,
  };
}
export type Totals = Awaited<ReturnType<typeof totals>>;

/** Views and visitors per hour, day or month of the range (empty buckets included). */
export async function series(range: Range) {
  const bucket = BUCKET[range.period];
  const [viewRows, uniqueRows] = await Promise.all([
    db
      .select({ key: bucketOf(pageViews.at, bucket), views: count() })
      .from(pageViews)
      .where(viewsIn(range))
      .groupBy(bucketOf(pageViews.at, bucket)),
    // Visitors per bucket: distinct per day, then added up into hours/months as the days fall.
    db
      .select({ key: bucket === "hour" ? bucketOf(pageViews.at, "hour") : dayOf(pageViews.at), visitors: countDistinct(pageViews.visitor) })
      .from(pageViews)
      .where(viewsIn(range))
      .groupBy(bucket === "hour" ? bucketOf(pageViews.at, "hour") : dayOf(pageViews.at)),
  ]);
  const views = new Map(viewRows.map((row) => [row.key, Number(row.views)]));
  const visitors = new Map<string, number>();
  for (const row of uniqueRows) {
    const key = bucket === "month" ? row.key.slice(0, 7) : row.key;
    visitors.set(key, (visitors.get(key) ?? 0) + Number(row.visitors));
  }
  return bucketKeys(range, bucket).map((key) => ({ key, views: views.get(key) ?? 0, visitors: visitors.get(key) ?? 0 }));
}

/** Every bucket of the range, in order, as the SQL formats them (Zurich time). */
function bucketKeys(range: Range, bucket: "hour" | "day" | "month") {
  const offset = zurichOffsetMinutes() * 60_000;
  const keys: string[] = [];
  const step = bucket === "hour" ? 3_600_000 : DAY;
  for (let at = range.start.getTime(); at <= range.end.getTime(); at += step) {
    const iso = new Date(at + offset).toISOString();
    const key = bucket === "hour" ? `${iso.slice(0, 10)} ${iso.slice(11, 13)}:00` : bucket === "day" ? iso.slice(0, 10) : iso.slice(0, 7);
    if (keys.at(-1) !== key) keys.push(key);
  }
  return keys;
}

/** Visitors on the site in the last five minutes. */
export async function liveVisitors(staff: boolean) {
  const [row] = await db
    .select({ value: countDistinct(pageViews.visitor) })
    .from(pageViews)
    .where(and(gte(pageViews.at, new Date(Date.now() - 5 * 60_000)), staff ? undefined : eq(pageViews.staff, false)));
  return Number(row?.value ?? 0);
}

/** The pages seen most, with a readable name for an article, event, match or product. */
export async function topPages(range: Range, locale: Locale, limit = 10) {
  const rows = await db
    .select({ path: pageViews.path, type: pageViews.contentType, id: pageViews.contentId, views: count(), visitors: countDistinct(pageViews.visitor) })
    .from(pageViews)
    .where(viewsIn(range))
    .groupBy(pageViews.path, pageViews.contentType, pageViews.contentId)
    .orderBy(desc(count()))
    .limit(limit);
  const names = await titlesOf(rows.flatMap((row) => (row.id ? [{ type: row.type, id: row.id }] : [])), locale);
  return rows.map((row) => ({
    path: row.path,
    type: row.type,
    title: row.id ? (names.get(`${row.type}:${row.id}`) ?? null) : null,
    views: Number(row.views),
    visitors: Number(row.visitors),
  }));
}

/** Names of the things pages show: article and event titles, "PSG – Lens", product names. */
async function titlesOf(items: { type: string; id: string }[], locale: Locale) {
  const ids = (type: string) => [...new Set(items.filter((item) => item.type === type).map((item) => item.id))];
  const names = new Map<string, string>();
  const [articleIds, eventIds, matchIds, productIds] = [ids("article"), ids("event"), ids("match"), ids("product")];
  await Promise.all([
    articleIds.length && db.select({ slug: posts.slug, title: posts.title }).from(posts).where(inArray(posts.slug, articleIds)).then((list) => list.forEach((row) => names.set(`article:${row.slug}`, row.title))),
    eventIds.length && db.select({ id: events.id, title: events.title }).from(events).where(inArray(events.id, eventIds)).then((list) => list.forEach((row) => names.set(`event:${row.id}`, row.title))),
    matchIds.length &&
      db
        .select({ id: matches.id, opponent: matches.opponent, venue: matches.venue })
        .from(matches)
        .where(inArray(matches.id, matchIds))
        .then((list) => list.forEach((row) => names.set(`match:${row.id}`, row.venue === "away" ? `${row.opponent} – PSG` : `PSG – ${row.opponent}`))),
    productIds.length &&
      db
        .select({ slug: products.slug, name: products.name })
        .from(products)
        .where(inArray(products.slug, productIds))
        .then((list) => list.forEach((row) => names.set(`product:${row.slug}`, row.name[locale] ?? row.name.fr ?? row.slug))),
  ]);
  return names;
}

/** Views per article or product, with its title. */
export async function topContent(range: Range, type: "article" | "product", locale: Locale, limit = 15) {
  const rows = await db
    .select({ id: pageViews.contentId, views: count(), visitors: countDistinct(pageViews.visitor), members: sql<number>`sum(${pageViews.signedIn})` })
    .from(pageViews)
    .where(and(viewsIn(range), eq(pageViews.contentType, type), isNotNull(pageViews.contentId)))
    .groupBy(pageViews.contentId)
    .orderBy(desc(count()))
    .limit(limit);
  const ids = rows.map((row) => row.id!).filter(Boolean);
  const titles = new Map<string, string>();
  if (ids.length && type === "article") {
    for (const post of await db.select({ slug: posts.slug, title: posts.title }).from(posts).where(inArray(posts.slug, ids))) titles.set(post.slug, post.title);
  }
  if (ids.length && type === "product") {
    for (const product of await db.select({ slug: products.slug, name: products.name }).from(products).where(inArray(products.slug, ids))) {
      titles.set(product.slug, product.name[locale] ?? product.name.fr ?? product.slug);
    }
  }
  return rows.map((row) => ({
    id: row.id!,
    title: titles.get(row.id!) ?? row.id!,
    views: Number(row.views),
    visitors: Number(row.visitors),
    memberShare: Number(row.views) ? Number(row.members ?? 0) / Number(row.views) : 0,
  }));
}

/** One article or product over the range: views per bucket, where its readers came from. */
export async function contentDetail(range: Range, type: "article" | "product", id: string) {
  const bucket = BUCKET[range.period];
  const where = and(viewsIn(range), eq(pageViews.contentType, type), eq(pageViews.contentId, id));
  const [perBucket, sources] = await Promise.all([
    db.select({ key: bucketOf(pageViews.at, bucket), views: count() }).from(pageViews).where(where).groupBy(bucketOf(pageViews.at, bucket)),
    db
      .select({ host: pageViews.referrerHost, views: count() })
      .from(pageViews)
      .where(and(where, eq(pageViews.entry, true)))
      .groupBy(pageViews.referrerHost)
      .orderBy(desc(count()))
      .limit(6),
  ]);
  const views = new Map(perBucket.map((row) => [row.key, Number(row.views)]));
  return {
    series: bucketKeys(range, bucket).map((key) => ({ key, views: views.get(key) ?? 0, visitors: 0 })),
    sources: sources.map((row) => ({ host: row.host, views: Number(row.views) })),
  };
}

/** Club events: card clicks, page views, unique viewers, registrations — and the funnel. */
export async function eventFigures(range: Range, limit = 15) {
  const clickWhere = and(gte(analyticsEvents.at, range.start), lt(analyticsEvents.at, range.end), eq(analyticsEvents.name, "event_card_click"), range.staff ? undefined : eq(analyticsEvents.staff, false));
  const [clicks, views] = await Promise.all([
    db.select({ id: analyticsEvents.targetId, clicks: count() }).from(analyticsEvents).where(clickWhere).groupBy(analyticsEvents.targetId),
    db
      .select({ id: pageViews.contentId, views: count(), visitors: countDistinct(pageViews.visitor) })
      .from(pageViews)
      .where(and(viewsIn(range), eq(pageViews.contentType, "event")))
      .groupBy(pageViews.contentId),
  ]);
  const ids = [...new Set([...clicks.map((row) => row.id), ...views.map((row) => row.id)].filter((id): id is string => Boolean(id)))];
  if (!ids.length) return { rows: [], funnel: { clicks: 0, views: 0, registrations: 0 } };
  const [list, registrations] = await Promise.all([
    db.select({ id: events.id, title: events.title, startsAt: events.startsAt }).from(events).where(inArray(events.id, ids)),
    db
      .select({ id: attendance.eventId, value: count() })
      .from(attendance)
      .where(and(inArray(attendance.eventId, ids), eq(attendance.status, "registered")))
      .groupBy(attendance.eventId),
  ]);
  const clickMap = new Map(clicks.map((row) => [row.id, Number(row.clicks)]));
  const viewMap = new Map(views.map((row) => [row.id, { views: Number(row.views), visitors: Number(row.visitors) }]));
  const registered = new Map(registrations.map((row) => [row.id, Number(row.value)]));
  const rows = list
    .map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      clicks: clickMap.get(event.id) ?? 0,
      views: viewMap.get(event.id)?.views ?? 0,
      visitors: viewMap.get(event.id)?.visitors ?? 0,
      registrations: registered.get(event.id) ?? 0,
    }))
    .sort((a, b) => b.views + b.clicks - (a.views + a.clicks))
    .slice(0, limit);
  const funnel = rows.reduce(
    (total, row) => ({ clicks: total.clicks + row.clicks, views: total.views + row.visitors, registrations: total.registrations + row.registrations }),
    { clicks: 0, views: 0, registrations: 0 },
  );
  return { rows, funnel };
}

/** The matches whose page was seen most. */
export async function topMatches(range: Range, limit = 8) {
  const rows = await db
    .select({ id: pageViews.contentId, views: count(), visitors: countDistinct(pageViews.visitor) })
    .from(pageViews)
    .where(and(viewsIn(range), eq(pageViews.contentType, "match"), isNotNull(pageViews.contentId)))
    .groupBy(pageViews.contentId)
    .orderBy(desc(count()))
    .limit(limit);
  const ids = rows.map((row) => row.id!).filter(Boolean);
  const list = ids.length ? await db.select({ id: matches.id, opponent: matches.opponent, venue: matches.venue, kickoffAt: matches.kickoffAt }).from(matches).where(inArray(matches.id, ids)) : [];
  const byId = new Map(list.map((match) => [match.id, match]));
  return rows.flatMap((row) => {
    const match = byId.get(row.id!);
    return match ? [{ ...match, views: Number(row.views), visitors: Number(row.visitors) }] : [];
  });
}

/** Where visitors come from, and on what. */
export async function sources(range: Range) {
  const group = async (column: typeof pageViews.device | typeof pageViews.browser | typeof pageViews.locale | typeof pageViews.referrerHost | typeof pageViews.utmSource, entryOnly = false) =>
    (
      await db
        .select({ key: column, views: count() })
        .from(pageViews)
        .where(and(viewsIn(range), entryOnly ? eq(pageViews.entry, true) : undefined))
        .groupBy(column)
        .orderBy(desc(count()))
        .limit(10)
    ).map((row) => ({ key: row.key as string | null, views: Number(row.views) }));
  const [referrers, campaigns, devices, browsers, locales, [split]] = await Promise.all([
    group(pageViews.referrerHost, true),
    group(pageViews.utmSource, true),
    group(pageViews.device),
    group(pageViews.browser),
    group(pageViews.locale),
    db.select({ members: sql<number>`sum(${pageViews.signedIn})`, total: count() }).from(pageViews).where(viewsIn(range)),
  ]);
  return {
    referrers,
    campaigns: campaigns.filter((row) => row.key),
    devices,
    browsers,
    locales,
    members: Number(split?.members ?? 0),
    total: Number(split?.total ?? 0),
  };
}

/** The API: most called routes, errors, times — and calls per bucket. */
export async function apiFigures(range: Range) {
  const bucket = BUCKET[range.period];
  const where = and(gte(apiUsage.bucket, range.start), lt(apiUsage.bucket, range.end));
  const [routes, perBucket] = await Promise.all([
    db
      .select({
        method: apiUsage.method,
        route: apiUsage.route,
        calls: sum(apiUsage.count),
        totalMs: sum(apiUsage.totalMs),
        maxMs: max(apiUsage.maxMs),
        clientErrors: sql<number>`sum(case when ${apiUsage.statusClass} = '4xx' then ${apiUsage.count} else 0 end)`,
        serverErrors: sql<number>`sum(case when ${apiUsage.statusClass} = '5xx' then ${apiUsage.count} else 0 end)`,
      })
      .from(apiUsage)
      .where(where)
      .groupBy(apiUsage.method, apiUsage.route)
      .orderBy(desc(sum(apiUsage.count)))
      .limit(25),
    db
      .select({
        key: bucketOf(apiUsage.bucket, bucket),
        calls: sum(apiUsage.count),
        errors: sql<number>`sum(case when ${apiUsage.statusClass} in ('4xx','5xx') then ${apiUsage.count} else 0 end)`,
      })
      .from(apiUsage)
      .where(where)
      .groupBy(bucketOf(apiUsage.bucket, bucket)),
  ]);
  const byKey = new Map(perBucket.map((row) => [row.key, { calls: Number(row.calls ?? 0), errors: Number(row.errors ?? 0) }]));
  const rows = routes.map((row) => {
    const calls = Number(row.calls ?? 0);
    return {
      method: row.method,
      route: row.route,
      calls,
      avgMs: calls ? Number(row.totalMs ?? 0) / calls : 0,
      maxMs: Number(row.maxMs ?? 0),
      clientErrors: Number(row.clientErrors ?? 0),
      serverErrors: Number(row.serverErrors ?? 0),
    };
  });
  const calls = rows.reduce((total, row) => total + row.calls, 0);
  const errors = rows.reduce((total, row) => total + row.clientErrors + row.serverErrors, 0);
  const serverErrors = rows.reduce((total, row) => total + row.serverErrors, 0);
  const avgMs = calls ? rows.reduce((total, row) => total + row.avgMs * row.calls, 0) / calls : 0;
  return {
    rows,
    calls,
    errorRate: calls ? errors / calls : 0,
    serverErrors,
    avgMs,
    series: bucketKeys(range, bucket).map((key) => ({ key, views: byKey.get(key)?.calls ?? 0, visitors: byKey.get(key)?.errors ?? 0 })),
  };
}
