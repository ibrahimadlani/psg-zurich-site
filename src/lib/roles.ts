import type { Role } from "@/db/schema";

// Moderators help on match days and with content; admins run the club; the superadmin manages the team.
const RANK: Record<Role, number> = { member: 1, moderator: 2, admin: 3, superadmin: 4 };

export function hasRole(role: Role | null | undefined, required: Role) {
  return role ? RANK[role] >= RANK[required] : false;
}

/**
 * What each part of the admin needs, section by section (the API checks the same thing).
 * `area`: opening the admin at all.
 */
export const CAPABILITIES = {
  area: "moderator",
  scan: "moderator",
  events: "moderator",
  news: "moderator",
  "members.read": "moderator",
  /** Contact messages; moderators only see some topics (lib/contact.ts). */
  messages: "moderator",
  "members.write": "admin",
  /** Payments, refunds, the books, the shop. */
  finances: "admin",
  mailing: "admin",
  polls: "admin",
  documents: "admin",
  /** The audience page (visits, reads, API use). */
  analytics: "admin",
  roles: "superadmin",
  audit: "superadmin",
  deploy: "superadmin",
} as const satisfies Record<string, Role>;
export type Capability = keyof typeof CAPABILITIES;

export const can = (role: Role | null | undefined, capability: Capability) => hasRole(role, CAPABILITIES[capability]);
