import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { Auth } from "./auth";

// Same origin as the app: no baseURL needed.
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>()],
});

export const { signIn, signOut, useSession, requestPasswordReset, resetPassword } = authClient;
