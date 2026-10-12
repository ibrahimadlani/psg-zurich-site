import { getFormatter, getTranslations } from "next-intl/server";
import Image from "next/image";
import type { members } from "@/db/schema";
import { currentSeason } from "@/lib/football/sync";
import { LEGAL } from "@/lib/legal";
import { cn } from "@/lib/utils";

type Member = typeof members.$inferSelect;

/** Membership card in the club colours: crest, name, number, status, since, season. */
export async function MemberCard({ member, name }: { member: Member | null; name: string }) {
  const [t, format] = await Promise.all([getTranslations("MemberArea"), getFormatter()]);
  const season = currentSeason();
  const active = member?.status === "active";

  return (
    <section className="space-y-3">
      <div
        className={cn(
          "relative overflow-hidden rounded-[18px] p-5 text-white shadow-brand sm:p-6",
          active ? "bg-psg-blue" : "bg-psg-blue/70 grayscale-[35%]",
        )}
      >
        {/* Red stripe of the crest, and the site's diagonal lines. */}
        <span aria-hidden className="absolute inset-y-0 right-[22%] w-10 bg-psg-red/90" />
        <span aria-hidden className="absolute inset-y-0 right-[22%] w-10 translate-x-10 bg-white/90" />
        <span
          aria-hidden
          className="absolute inset-0 [background-image:repeating-linear-gradient(135deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_14px)]"
        />
        <div className="relative flex min-h-44 flex-col justify-between gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/brand/psg-crest.svg" alt="" width={40} height={40} className="size-10" />
              <div className="leading-tight">
                <p className="font-wide text-[10px] font-semibold tracking-[0.08em] uppercase opacity-80">Supporters Club</p>
                <p className="text-lg font-semibold">PSG Zurich</p>
              </div>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-wide text-[9px] font-semibold tracking-[0.08em] uppercase backdrop-blur-sm">
              {member ? t(`membership.status.${member.status}`) : "—"}
            </span>
          </div>
          <div className="space-y-3">
            <p className="font-narrow text-[length:clamp(26px,5vw,34px)] leading-none font-extrabold uppercase italic">{name}</p>
            <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <dt className="font-wide text-[9px] font-semibold tracking-[0.08em] uppercase opacity-70">{t("membership.number")}</dt>
                <dd className="font-mono font-semibold">{member?.memberNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-wide text-[9px] font-semibold tracking-[0.08em] uppercase opacity-70">{t("membership.joined")}</dt>
                <dd className="font-semibold">
                  {member?.joinedOn ? format.dateTime(new Date(`${member.joinedOn}T12:00:00Z`), { month: "long", year: "numeric" }) : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-wide text-[9px] font-semibold tracking-[0.08em] uppercase opacity-70">{t("card.season")}</dt>
                <dd className="font-semibold">{`${season}/${String((season + 1) % 100).padStart(2, "0")}`}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <p className="text-sm text-pretty text-muted-foreground">
        {member ? t(`membership.help.${member.status}`, { email: LEGAL.email }) : t("membership.noProfile")}
        {member ? ` ${t("membership.fee")} : ${t("membership.feeSoon")}` : null}
      </p>
    </section>
  );
}
