import "server-only";
import { desc, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { announcements, auditLog, documents, events, matches, members, polls, posts, user } from "@/db/schema";
import { matchTitle } from "@/lib/matches";

/** The journal's filters: the first part of the action ("member.approve" → member). */
export const AUDIT_DOMAINS = ["member", "event", "match", "post", "announcement", "poll", "document", "mailing", "user"] as const;
export type AuditDomain = (typeof AUDIT_DOMAINS)[number];

export const AUDIT_PAGE = 50;

/** Where an entry leads in the admin. */
function entityHref(type: string, id: string | null) {
  if (!id) return null;
  if (type === "member") return `/admin/membres/${id}`;
  if (type === "event") return `/admin/evenements/${id}`;
  if (type === "post") return `/admin/actualites/${id}`;
  if (type === "match") return "/admin/matchs";
  if (type === "poll") return "/admin/sondages";
  if (type === "document") return "/admin/documents";
  if (type === "announcement") return "/admin/banniere";
  if (type === "email_campaign") return `/admin/mailing/campagnes/${id}`;
  return null;
}

/**
 * A page of the audit log (newest first), each entry with who did it, a readable name for what
 * it was done to (member, event, article… looked up in one query per kind) and a link to it.
 */
export async function auditPage(domain: AuditDomain | null, page: number) {
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
      actorName: user.name,
      actorEmail: user.email,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .where(domain ? like(auditLog.action, `${domain}.%`) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(AUDIT_PAGE + 1)
    .offset(page * AUDIT_PAGE);
  const more = rows.length > AUDIT_PAGE;
  const list = rows.slice(0, AUDIT_PAGE);

  // Names of what the entries are about, gathered by kind.
  const ids = (type: string) => [...new Set(list.filter((row) => row.entityType === type && row.entityId).map((row) => row.entityId!))];
  const memberIds = [
    ...ids("member"),
    ...list.map((row) => (typeof row.metadata?.memberId === "string" ? row.metadata.memberId : null)).filter((value): value is string => Boolean(value)),
  ];
  const [memberNames, eventNames, postNames, pollNames, documentNames, matchNames, userNames, bannerNames] = await Promise.all([
    memberIds.length ? db.select({ id: members.id, a: members.firstName, b: members.lastName }).from(members).where(inArray(members.id, memberIds)) : [],
    ids("event").length ? db.select({ id: events.id, a: events.title }).from(events).where(inArray(events.id, ids("event"))) : [],
    ids("post").length ? db.select({ id: posts.id, a: posts.title }).from(posts).where(inArray(posts.id, ids("post"))) : [],
    ids("poll").length ? db.select({ id: polls.id, a: polls.question }).from(polls).where(inArray(polls.id, ids("poll"))) : [],
    ids("document").length ? db.select({ id: documents.id, a: documents.title }).from(documents).where(inArray(documents.id, ids("document"))) : [],
    ids("match").length ? db.select({ id: matches.id, opponent: matches.opponent, venue: matches.venue }).from(matches).where(inArray(matches.id, ids("match"))) : [],
    ids("user").length ? db.select({ id: user.id, a: user.name, b: user.email }).from(user).where(inArray(user.id, ids("user"))) : [],
    ids("announcement").length ? db.select({ id: announcements.id, a: announcements.titleFr }).from(announcements).where(inArray(announcements.id, ids("announcement"))) : [],
  ]);
  const names = new Map<string, string>([
    ...memberNames.map((row) => [row.id, `${row.a} ${row.b}`.trim()] as const),
    ...eventNames.map((row) => [row.id, row.a] as const),
    ...postNames.map((row) => [row.id, row.a] as const),
    ...pollNames.map((row) => [row.id, row.a] as const),
    ...documentNames.map((row) => [row.id, row.a] as const),
    ...matchNames.map((row) => [row.id, matchTitle(row, "PSG")] as const),
    ...userNames.map((row) => [row.id, row.a || row.b] as const),
    ...bannerNames.map((row) => [row.id, row.a] as const),
  ]);

  return {
    more,
    entries: list.map((row) => {
      const metadata = row.metadata ?? {};
      // Deleted things keep the name written at the time, when there is one.
      const fallback = typeof metadata.title === "string" ? metadata.title : typeof metadata.question === "string" ? metadata.question : null;
      const memberId = typeof metadata.memberId === "string" ? metadata.memberId : null;
      return {
        id: row.id,
        action: row.action,
        createdAt: row.createdAt,
        actor: row.actorName || row.actorEmail || null,
        target: (row.entityId ? names.get(row.entityId) : null) ?? fallback,
        // Sign-up actions on an event also name the member concerned.
        about: memberId && row.entityType === "event" ? (names.get(memberId) ?? null) : null,
        reason: typeof metadata.reason === "string" ? metadata.reason : null,
        count: typeof metadata.count === "number" ? metadata.count : null,
        href: entityHref(row.entityType, row.entityId),
      };
    }),
  };
}
