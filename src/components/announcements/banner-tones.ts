import type { announcements } from "@/db/schema";

type Tone = (typeof announcements.$inferSelect)["tone"];

/** Colours of each kind of banner (the site's bar and the admin's previews). */
export const BANNER_TONES: Record<Tone, string> = {
  info: "bg-primary text-primary-foreground",
  maintenance: "bg-psg-blue text-white dark:bg-foreground dark:text-background",
  urgent: "bg-psg-red text-white",
};
