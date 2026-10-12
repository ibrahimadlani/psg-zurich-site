import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { Auth } from "./auth";

// Same origin as the app: no baseURL needed.
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>()],
});

export const {
  signIn,
  signOut,
  requestPasswordReset,
  resetPassword,
  changePassword,
  revokeOtherSessions,
  deleteUser,
} = authClient;

// Set once the first session request has answered (browser only: the server always renders "loading").
let settled = false;

/**
 * Better Auth's useSession, except that `isPending` is only true for the very first load:
 * a refetch (window focus, navigation) flags visitors as pending again, which made the
 * header blink between the sign-in button and its placeholder.
 */
export function useSession() {
  const session = authClient.useSession();
  if (!session.isPending) settled = true;
  return { ...session, isPending: session.isPending && !settled };
}
