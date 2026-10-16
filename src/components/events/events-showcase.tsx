import { useTranslations } from "next-intl";
import {
  AwayTripIllustration,
  MembersMatchIllustration,
  SocialIllustration,
  WatchPartyIllustration,
} from "@/components/events/event-illustrations";
import { EventPreview } from "@/components/events/event-preview";
import { LockedCard } from "@/components/membership/locked-card";
import type { EventAccess } from "@/lib/dues";

const KINDS = [
  { type: "watch_party", Illustration: WatchPartyIllustration },
  { type: "away_trip", Illustration: AwayTripIllustration },
  { type: "members_match", Illustration: MembersMatchIllustration },
  { type: "social", Illustration: SocialIllustration },
] as const;

/**
 * /evenements for everyone who isn't an accepted member: what the club does, illustrated,
 * then a locked sample event with the way in. The programme itself is for members whose fee is paid.
 */
/** `next`: the event a visitor tried to open, to come back to once signed in. */
export function EventsShowcase({ access, next = "/evenements" }: { access: Exclude<EventAccess, "full">; next?: string }) {
  const t = useTranslations("EventsShowcase");
  const types = useTranslations("Events.types");

  return (
    <div className="flex flex-col gap-[clamp(32px,5vw,48px)]">
      <ul className="grid gap-[clamp(16px,2.5vw,24px)] sm:grid-cols-2">
        {KINDS.map(({ type, Illustration }) => (
          <li key={type} className="group flex flex-col overflow-hidden rounded-[14px] border bg-card shadow-brand">
            <div className="aspect-[8/5] overflow-hidden">
              <div className="size-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none">
                <Illustration label={types(type)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 p-[clamp(16px,2.5vw,22px)]">
              <h2 className="font-narrow text-[26px] leading-none font-extrabold uppercase italic">{types(type)}</h2>
              <p className="text-[15px] leading-normal text-pretty text-muted-foreground">{t(`kinds.${type}`)}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* What a member would see here: a sample event, locked, with this visitor's next step. */}
      <LockedCard access={access} feature="events" next={next} preview={<EventPreview />} />
    </div>
  );
}
