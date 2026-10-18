import { z } from "zod";
import { db } from "@/db";
import { analyticsEvents, pageViews } from "@/db/schema";
import { getProxiedClientIp } from "@/lib/audit";
import { getAuth } from "@/lib/auth";
import { publicOrigin } from "@/lib/public-origin";
import { browserOf, contentOf, deviceOf, isBot, referrerHostOf, splitPath } from "@/lib/analytics/classify";
import { visitorHash } from "@/lib/analytics/visitor";
import { rateLimit } from "@/lib/rate-limit";
import { hasRole } from "@/lib/roles";

/*
 * The audience beacon (navigator.sendBeacon, see components/analytics/page-view-tracker.tsx):
 * a page seen or a click worth counting. No cookie set, no IP stored (lib/analytics/visitor.ts).
 * Always answers 204: a visitor never waits on it, nor sees it fail.
 */

const body = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("view"),
    path: z.string().max(400),
    referrer: z.string().max(500).optional(),
    utm: z.string().max(100).optional(),
    entry: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("event"),
    name: z.string().regex(/^[a-z_]{2,60}$/),
    targetType: z.string().regex(/^[a-z_]{1,30}$/).optional(),
    targetId: z.string().max(191).optional(),
    path: z.string().max(400),
  }),
]);

const done = () => new Response(null, { status: 204 });
// A page viewed every 0.5 s for a minute is plenty for a person.
const PER_MINUTE = 120;

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  // Robots, and visitors who asked not to be tracked (Do Not Track, Global Privacy Control).
  if (isBot(userAgent) || request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1") return done();
  const ip = getProxiedClientIp(request.headers) ?? "local";
  if (!rateLimit(`analytics:${ip}`, PER_MINUTE, 60_000)) return done();

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return done();
  const input = parsed.data;
  const where = splitPath(input.path);
  if (!where || where.path.startsWith("/admin")) return done();

  try {
    const [visitor, session] = await Promise.all([
      visitorHash(ip, userAgent),
      getAuth().api.getSession({ headers: request.headers }).catch(() => null),
    ]);
    const staff = hasRole(session?.user.role, "moderator");
    if (input.type === "view") {
      const content = contentOf(where.path);
      await db.insert(pageViews).values({
        path: where.path,
        locale: where.locale,
        contentType: content.type,
        contentId: content.id,
        visitor,
        signedIn: Boolean(session),
        staff,
        entry: Boolean(input.entry),
        referrerHost: referrerHostOf(input.referrer, new URL(publicOrigin(request)).hostname),
        utmSource: input.utm?.toLowerCase().slice(0, 100) || null,
        device: deviceOf(userAgent),
        browser: browserOf(userAgent),
      });
    } else {
      await db.insert(analyticsEvents).values({
        name: input.name,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        visitor,
        path: where.path,
        staff,
      });
    }
  } catch (error) {
    console.error("[analytics] not recorded", error);
  }
  return done();
}
