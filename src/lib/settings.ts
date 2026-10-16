import "server-only";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";

/** Session + member profile of the settings pages; visitors go to the sign-in page, then back. */
export async function getSettingsContext() {
  const session = await getSession();
  if (!session) return redirectToSignIn();
  return { session, member: await getCurrentMember() };
}
