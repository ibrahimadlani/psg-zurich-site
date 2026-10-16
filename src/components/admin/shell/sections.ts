import {
  Banknote,
  CalendarDays,
  FileText,
  House,
  Inbox,
  Mail,
  Megaphone,
  Newspaper,
  ScanLine,
  ScrollText,
  Settings2,
  Trophy,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";
import type { Capability } from "@/lib/roles";

/** Counters shown next to a section (from /api/v1/admin/summary). */
export type AdminBadge = "requests" | "unpaid" | "failedEmails" | "messages";

export type AdminSection = {
  key: "home" | "members" | "messages" | "dues" | "events" | "matches" | "scanner" | "news" | "mailing" | "banner" | "polls" | "documents" | "settings" | "journal";
  href: string;
  icon: LucideIcon;
  capability: Capability;
  group: "club" | "programme" | "content" | "team";
  badge?: AdminBadge;
  /** In the phone's bottom bar (the others are under "Plus"). */
  tab?: boolean;
};

export const ADMIN_SECTIONS: AdminSection[] = [
  { key: "home", href: "/admin", icon: House, capability: "area", group: "club", tab: true },
  { key: "members", href: "/admin/membres", icon: Users, capability: "members.read", group: "club", badge: "requests", tab: true },
  { key: "messages", href: "/admin/messages", icon: Inbox, capability: "messages", group: "club", badge: "messages" },
  { key: "dues", href: "/admin/cotisations", icon: Banknote, capability: "members.write", group: "club", badge: "unpaid" },
  // Phone bar order: home, members, the scanner in the middle, events.
  { key: "scanner", href: "/admin/scanner", icon: ScanLine, capability: "scan", group: "programme", tab: true },
  { key: "events", href: "/admin/evenements", icon: CalendarDays, capability: "events", group: "programme", tab: true },
  { key: "matches", href: "/admin/matchs", icon: Trophy, capability: "events", group: "programme" },
  { key: "news", href: "/admin/actualites", icon: Newspaper, capability: "news", group: "content" },
  { key: "mailing", href: "/admin/mailing", icon: Mail, capability: "mailing", group: "content", badge: "failedEmails" },
  { key: "banner", href: "/admin/banniere", icon: Megaphone, capability: "news", group: "content" },
  { key: "polls", href: "/admin/sondages", icon: Vote, capability: "polls", group: "content" },
  { key: "documents", href: "/admin/documents", icon: FileText, capability: "documents", group: "content" },
  { key: "settings", href: "/admin/reglages", icon: Settings2, capability: "roles", group: "team" },
  { key: "journal", href: "/admin/journal", icon: ScrollText, capability: "audit", group: "team" },
];

export const ADMIN_GROUPS = ["club", "programme", "content", "team"] as const;

/** The section a path belongs to: the longest matching href ("/admin" only for itself). */
export function activeSection(pathname: string, sections: AdminSection[]) {
  return sections
    .filter(({ href }) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
