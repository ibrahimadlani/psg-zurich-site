import { Bell, Lock, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";

/** Settings sections, in menu order: /settings/<slug>. */
export const SETTINGS_SECTIONS = [
  { slug: "profile", key: "profile", icon: UserRound },
  { slug: "account", key: "account", icon: ShieldCheck },
  { slug: "preferences", key: "preferences", icon: SlidersHorizontal },
  { slug: "notifications", key: "notifications", icon: Bell },
  { slug: "privacy", key: "privacy", icon: Lock },
] as const;

export type SettingsSectionKey = (typeof SETTINGS_SECTIONS)[number]["key"];
