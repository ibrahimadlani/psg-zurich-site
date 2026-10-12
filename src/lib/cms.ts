import "server-only";
import { asc, desc, eq, gte } from "drizzle-orm";
import { getFormatter, getLocale } from "next-intl/server";
import { db } from "@/db";
import { events, matches, posts } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { parseBlocks } from "@/lib/article-blocks";
import { getEventsWithAttendance } from "@/lib/events";
import { matchTitle } from "@/lib/matches";
import { getSession } from "@/lib/permissions";
import { hasRole } from "@/lib/roles";

/** Admins only; visitors go to sign-in, members get null (the page shows "forbidden"). */
export async function requireCmsAccess() {
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale: await getLocale() });
  return hasRole(session.user.role, "admin") ? session : null;
}

/** Choices and preview data of the editor: matches, events, articles to translate. */
export async function editorData(excludePostId?: string) {
  const format = await getFormatter();
  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
  const [matchRows, eventRows, originals] = await Promise.all([
    db.select().from(matches).where(gte(matches.kickoffAt, since)).orderBy(asc(matches.kickoffAt)),
    getEventsWithAttendance(gte(events.startsAt, since), null),
    db
      .select({ id: posts.id, title: posts.title, locale: posts.locale, group: posts.translationGroup })
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(100),
  ]);
  return {
    matches: matchRows.map((match) => ({
      id: match.id,
      label: `${format.dateTime(match.kickoffAt, { day: "numeric", month: "short", year: "numeric" })} · ${matchTitle(match, "PSG")} (${match.competition})`,
    })),
    events: eventRows.map((event) => ({
      id: event.id,
      label: `${format.dateTime(event.startsAt, { day: "numeric", month: "short" })} · ${event.title}`,
    })),
    // Only originals can be translated (a translation joins its original's group).
    originals: originals
      .filter((post) => post.id !== excludePostId && (post.group === null || post.group === post.id))
      .map((post) => ({ id: post.id, label: `${post.locale.toUpperCase()} · ${post.title}` })),
    refs: { matches: new Map(matchRows.map((match) => [match.id, match])), events: new Map(eventRows.map((event) => [event.id, event])) },
  };
}

// datetime-local value in Zurich time, from a UTC date.
export const toLocalInput = (date: Date | null) =>
  date
    ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich", dateStyle: "short", timeStyle: "short" }).format(date).replace(" ", "T")
    : "";

export async function loadPost(id: string) {
  const [post] = await db.select().from(posts).where(eq(posts.id, id));
  return post ? { post, blocks: parseBlocks(post.content) } : null;
}

/** Draft, scheduled (published with a future date) or published. */
export function postState(post: { status: "draft" | "published"; publishedAt: Date | null }) {
  if (post.status === "draft") return "draft" as const;
  return (post.publishedAt?.getTime() ?? 0) > Date.now() ? ("scheduled" as const) : ("published" as const);
}
