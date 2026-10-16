import "server-only";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { getSession } from "@/lib/permissions";
import { can, type Capability } from "@/lib/roles";

/**
 * For admin pages: visitors go to sign-in (and come back to the page they asked for after),
 * signed-in users without the right get null (the page shows "forbidden").
 */
export async function adminPage(capability: Capability) {
  const session = await getSession();
  if (!session) return redirectToSignIn();
  return can(session.user.role, capability) ? session : null;
}
