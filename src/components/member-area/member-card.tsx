import { getFormatter, getTranslations } from "next-intl/server";
import Image from "next/image";
import type { members } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { isDuesPaid } from "@/lib/dues";
import { FlipCard } from "@/components/member-area/flip-card";
import { currentSeason } from "@/lib/football/sync";
import { LEGAL } from "@/lib/legal";
import { cardScanUrl, ensureCardToken, qrSvg } from "@/lib/member-card";
import { cn } from "@/lib/utils";

type Member = typeof members.$inferSelect;

/** Membership card in the club colours: crest, name, number, status, since, season. */
export async function MemberCard({ member, name }: { member: Member | null; name: string }) {
  const [t, format] = await Promise.all([getTranslations("MemberArea"), getFormatter()]);
  const season = currentSeason();
  const active = member?.status === "active";
  const paid = isDuesPaid(member);
  // Back of the card: QR code for event check-in, once the membership is accepted.
  const qr = member && active ? await qrSvg(await cardScanUrl(await ensureCardToken(member.id, member.cardToken))) : null;

  return (
    <section className="flex flex-col items-center gap-4 sm:items-start">
      <FlipCard
        anchor="carte"
        label={t("card.flip")}
        hint={t("card.flipHint")}
        front={
          <div
            className={cn(
              "relative size-full p-[6cqw] text-white",
              active ? "bg-psg-blue" : "bg-psg-blue/70 grayscale-[35%]",
            )}
          >
            {/* Red and white stripes of the crest, near the edge so the text never sits on them. */}
            <span aria-hidden className="absolute inset-y-0 right-[8cqw] w-[5.5cqw] bg-psg-red/90" />
            <span aria-hidden className="absolute inset-y-0 right-[2.5cqw] w-[5.5cqw] bg-white/90" />
            <span
              aria-hidden
              className="absolute inset-0 [background-image:repeating-linear-gradient(135deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_14px)]"
            />
            {/* Above: the site's diagonal lines over the blue. */}
            <div className="relative flex size-full flex-col justify-between">
              <div className="flex items-start justify-between gap-[3cqw]">
                <div className="flex items-center gap-[2.8cqw]">
                  <Image src="/brand/psg-crest.svg" alt="" width={48} height={48} className="size-[11cqw]" />
                  <div className="leading-tight">
                    <p className="font-wide text-[2.4cqw] font-semibold tracking-[0.08em] uppercase opacity-80">Supporters Club</p>
                    <p className="text-[4.6cqw] font-semibold">PSG Zurich</p>
                  </div>
                </div>
                <span className="relative z-10 rounded-full bg-psg-blue px-[2.6cqw] py-[1cqw] font-wide text-[2.2cqw] font-semibold tracking-[0.08em] uppercase ring-1 ring-white/25">
                  {member ? t(`membership.status.${member.status}`) : "—"}
                </span>
              </div>
              <div className="space-y-[2.4cqw]">
                <p className="max-w-[72cqw] truncate font-narrow text-[8cqw] leading-none font-extrabold uppercase italic">{name}</p>
                <dl className="flex max-w-[78cqw] gap-x-[4cqw] [&_dt]:whitespace-nowrap">
                  <div>
                    <dt className="font-wide text-[2.1cqw] font-semibold tracking-[0.08em] uppercase opacity-70">{t("membership.number")}</dt>
                    <dd className="font-mono text-[3.3cqw] font-semibold">{member?.memberNumber ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-wide text-[2.1cqw] font-semibold tracking-[0.08em] uppercase opacity-70">{t("membership.joined")}</dt>
                    <dd className="text-[3.3cqw] font-semibold">
                      {member?.joinedOn
                        ? format.dateTime(new Date(`${member.joinedOn}T12:00:00Z`), { month: "short", year: "numeric" })
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-wide text-[2.1cqw] font-semibold tracking-[0.08em] uppercase opacity-70">{t("card.season")}</dt>
                    <dd className="text-[3.3cqw] font-semibold">{`${season}/${String((season + 1) % 100).padStart(2, "0")}`}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        }
        back={
          <div className="relative flex size-full items-center gap-[5cqw] bg-psg-blue p-[6cqw] text-white">
            <span
              aria-hidden
              className="absolute inset-0 [background-image:repeating-linear-gradient(135deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_14px)]"
            />
            {qr ? (
              <div
                role="img"
                aria-label={t("card.qrLabel")}
                className="relative aspect-square h-full shrink-0 rounded-[3cqw] bg-white p-[3cqw] [&_svg]:size-full"
                // Markup generated by the qrcode library from our own URL: no user content.
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            ) : null}
            <div className="relative min-w-0 space-y-[2cqw]">
              <p className="font-wide text-[2.4cqw] font-semibold tracking-[0.08em] uppercase opacity-80">{t("card.backTitle")}</p>
              <p className="line-clamp-2 font-narrow text-[5.2cqw] leading-[0.95] font-extrabold break-words uppercase italic">{name}</p>
              {member?.memberNumber ? <p className="font-mono text-[3.4cqw] font-semibold">{member.memberNumber}</p> : null}
              <p className="text-[2.8cqw] leading-snug text-pretty opacity-80">{qr ? t("card.backHint") : t("card.backPending")}</p>
            </div>
          </div>
        }
      />
      <p className="text-sm text-pretty text-muted-foreground">
        {member ? t(`membership.help.${member.status}`, { email: LEGAL.email }) : t("membership.noProfile")}
      </p>
      {/* Fee of the season, once accepted: paid until…, or the way to pay it. */}
      {active ? (
        paid ? (
          <p className="flex items-center gap-2 text-sm">
            <span aria-hidden className="size-1.5 rounded-full bg-ok" />
            {t("membership.feePaid", {
              date: format.dateTime(new Date(`${member.expiresOn}T12:00:00Z`), { dateStyle: "long" }),
            })}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-psg-red/30 bg-psg-red/5 p-3.5">
            <p className="text-sm">{t("membership.feeDue")}</p>
            <Link
              href="/dues"
              prefetch={false}
              className="inline-flex h-9 items-center rounded-[8px] bg-segment px-4 font-wide text-[11px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-opacity hover:opacity-90"
            >
              {t("membership.payFee")}
            </Link>
          </div>
        )
      ) : null}
    </section>
  );
}
