import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";

/** Session + member profile of the settings pages; visitors go to the sign-in page. */
export async function getSettingsContext() {
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale: await getLocale() });
  return { session, member: await getCurrentMember() };
}
