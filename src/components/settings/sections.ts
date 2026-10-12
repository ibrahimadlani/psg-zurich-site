import { Bell, Lock, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";

/** Settings sections, in menu order: /parametres/<slug>. */
export const SETTINGS_SECTIONS = [
  { slug: "profil", key: "profile", icon: UserRound },
  { slug: "compte", key: "account", icon: ShieldCheck },
  { slug: "preferences", key: "preferences", icon: SlidersHorizontal },
  { slug: "notifications", key: "notifications", icon: Bell },
  { slug: "confidentialite", key: "privacy", icon: Lock },
] as const;

export type SettingsSectionKey = (typeof SETTINGS_SECTIONS)[number]["key"];
