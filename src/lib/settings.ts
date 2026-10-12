import "server-only";
import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/permissions";

/** Session + member profile of the settings pages; visitors go to the sign-in page. */
export async function getSettingsContext() {
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale: await getLocale() });
  const [member] = await db.select().from(members).where(eq(members.userId, session.user.id));
  return { session, member: member ?? null };
}
