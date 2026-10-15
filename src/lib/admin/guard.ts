import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/permissions";
import { can, type Capability } from "@/lib/roles";

/**
 * For admin pages: visitors go to sign-in (and come back to `path` after), signed-in users
 * without the right get null (the page shows "forbidden").
 */
export async function adminPage(capability: Capability, path: string) {
  const session = await getSession();
  if (!session) return redirect({ href: `/connexion?suite=${encodeURIComponent(path)}`, locale: await getLocale() });
  return can(session.user.role, capability) ? session : null;
}
