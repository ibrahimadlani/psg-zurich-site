import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BrandShell } from "@/components/brand-shell";
import { InstagramIcon } from "@/components/instagram-icon";
import { INSTAGRAM } from "@/lib/social";

export async function generateMetadata(): Promise<Metadata> {
  const [t, site] = await Promise.all([getTranslations("ComingSoon"), getTranslations("Metadata")]);
  // The layout's title template only applies to child segments, not to this page.
  return { title: { absolute: `${t("title")} · ${site("title")}` } };
}

/**
 * Small isometric traffic cone: slab base, two-tone cone (lit left, shaded right), white bands.
 * `mirrored`: the one on the right, flipped so the pair frames the text.
 */
function TrafficCone({ id, mirrored = false }: { id: string; mirrored?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`size-[18px] shrink-0 overflow-visible ${mirrored ? "-scale-x-100" : ""}`}>
      <defs>
        <clipPath id={id}>
          <path d="M10.5 3.4Q12 0.6 13.5 3.4L16.8 17.2Q17.1 18.5 15.9 18.9Q12 20.1 8.1 18.9Q6.9 18.5 7.2 17.2Z" />
        </clipPath>
      </defs>
      {/* Base slab: top face, then the two visible sides (same-colour round strokes soften the corners). */}
      <path d="M2.5 18.6 12 15 21.5 18.6 12 22.2Z" fill="#f97316" stroke="#f97316" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M2.5 18.6 12 22.2V23.8L2.5 20.2Z" fill="#c2410c" stroke="#c2410c" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M21.5 18.6 12 22.2V23.8L21.5 20.2Z" fill="#9a3412" stroke="#9a3412" strokeWidth="1.6" strokeLinejoin="round" />
      <g clipPath={`url(#${id})`}>
        <rect x="6" y="1" width="6" height="21" fill="#fb923c" />
        <rect x="12" y="1" width="6" height="21" fill="#ea580c" />
        <rect x="6" y="7" width="6" height="2.6" fill="#fff" />
        <rect x="12" y="7" width="6" height="2.6" fill="#e2e8f0" />
        <rect x="6" y="12.2" width="6" height="2.8" fill="#fff" />
        <rect x="12" y="12.2" width="6" height="2.8" fill="#e2e8f0" />
      </g>
    </svg>
  );
}

export default async function ComingSoonPage() {
  const t = await getTranslations("ComingSoon");

  return (
    <BrandShell>
      <div className="flex max-w-[34rem] flex-col items-center gap-3 text-center">
        <span className="flex items-center gap-2 font-wide text-[12px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          <TrafficCone id="cone-left" />
          {t("eyebrow")}
          <TrafficCone id="cone-right" mirrored />
        </span>
        <h1 className="font-narrow text-[length:clamp(48px,9vw,88px)] leading-[0.95] font-extrabold tracking-normal text-balance uppercase italic">
          {t("title")}
        </h1>
        <p className="text-[17px] leading-[1.55] text-pretty text-muted-foreground">{t("body")}</p>
        <a
          href="mailto:contact@psg-zurich.ch"
          className="mt-3 border-b pb-[3px] font-wide text-[15px] tracking-[0.02em] text-foreground transition-colors hover:border-brand-red"
        >
          contact@psg-zurich.ch
        </a>
        <a
          href={INSTAGRAM.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[14px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <InstagramIcon />
          {INSTAGRAM.handle}
        </a>
      </div>
    </BrandShell>
  );
}
