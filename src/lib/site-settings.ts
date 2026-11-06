import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings, type HomeMemberVariant, type HomeVisitorVariant } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";

/** Which home page visitors and members get (until the committee picks: the waiting page and the dashboard). */
export async function getHomeSettings(): Promise<{ visitor: HomeVisitorVariant; member: HomeMemberVariant }> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
  return { visitor: row?.homeVisitor ?? "coming_soon", member: row?.homeMember ?? "dashboard" };
}

/** Who shows each competition in Switzerland, as the committee checked it ({} until then). */
export async function getBroadcasters(): Promise<Record<string, string>> {
  const [row] = await db.select({ broadcasters: siteSettings.broadcasters }).from(siteSettings).where(eq(siteSettings.id, 1));
  return row?.broadcasters ?? {};
}

/** The channel to name for a match: its own if it has one, else its competition's, else none. */
export async function matchBroadcaster(match: { broadcaster: string | null; competition: string }) {
  return match.broadcaster || (await getBroadcasters())[match.competition] || null;
}

export async function saveBroadcasters(broadcasters: Record<string, string>, actor: { actorId: string; ipAddress: string | null }) {
  await db
    .insert(siteSettings)
    .values({ id: 1, broadcasters, updatedById: actor.actorId })
    .onDuplicateKeyUpdate({ set: { broadcasters, updatedById: actor.actorId } });
  await writeAuditLog({ actorId: actor.actorId, action: "site.broadcasters", entityType: "site_settings", entityId: null, metadata: broadcasters, ipAddress: actor.ipAddress });
}

export async function saveHomeSettings(settings: { visitor: HomeVisitorVariant; member: HomeMemberVariant }, actor: { actorId: string; ipAddress: string | null }) {
  await db
    .insert(siteSettings)
    .values({ id: 1, homeVisitor: settings.visitor, homeMember: settings.member, updatedById: actor.actorId })
    .onDuplicateKeyUpdate({ set: { homeVisitor: settings.visitor, homeMember: settings.member, updatedById: actor.actorId } });
  await writeAuditLog({ actorId: actor.actorId, action: "user.home_settings", entityType: "site_settings", entityId: null, metadata: settings, ipAddress: actor.ipAddress });
}
