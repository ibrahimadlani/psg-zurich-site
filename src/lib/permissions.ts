import "server-only";
import { headers } from "next/headers";
import type { Role } from "@/db/schema";
import { getAuth, type Session } from "@/lib/auth";
import { hasRole } from "@/lib/roles";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function getSession(): Promise<Session | null> {
  // Read the request first: during prerendering this is where rendering stops.
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}

/** Returns the session if the current user has at least `role`, throws an HttpError otherwise. */
export async function requireRole(role: Role): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new HttpError(401, "unauthorized", "Authentication required.");
  }
  if (!hasRole(session.user.role, role)) {
    throw new HttpError(403, "forbidden", `Role "${role}" required.`);
  }
  return session;
}
