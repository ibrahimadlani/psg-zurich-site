"use client";

import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand-logo";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";

const EMAIL = "contact@psg-zurich.ch";

// Their answer depends on the session (redirect when signed in): never prefetched.
const guestOnly = new Set(["/adhesion", "/connexion"]);

const heading = "font-wide text-[10px] font-semibold tracking-[0.08em] text-foreground uppercase";
const link = "text-[14px] text-muted-foreground transition-colors hover:text-foreground";

/** Long footer for visitors (brand, links, contact); one line for signed-in members. */
export function SiteFooter() {
  const { data } = useSession();
  return data ? <MemberFooter /> : <VisitorFooter />;
}

/** "Statuts · Mentions légales · Confidentialité" */
function LegalLinks() {
  const t = useTranslations("Footer");
  return (
    <span className="flex items-center gap-x-4">
      <Link href="/statuts" className="transition-colors hover:text-foreground">
        {t("statutes")}
      </Link>
      <Link href="/mentions-legales" className="transition-colors hover:text-foreground">
        {t("imprint")}
      </Link>
      <Link href="/confidentialite" className="transition-colors hover:text-foreground">
        {t("privacy")}
      </Link>
    </span>
  );
}

function MemberFooter() {
  const t = useTranslations("Footer");
  return (
    <footer className="relative border-t">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-4 text-[12px] text-muted-foreground">
        <p>© PSG Zurich · {t("official")}</p>
        <LegalLinks />
      </div>
    </footer>
  );
}

function VisitorFooter() {
  const t = useTranslations("Footer");
  const tNav = useTranslations("Nav");
  const tLogin = useTranslations("Login");

  const columns = [
    {
      title: t("club"),
      links: [
        { href: "/actualites", label: tNav("news") },
        { href: "/matchs", label: tNav("matches") },
        { href: "/evenements", label: tNav("events") },
      ],
    },
    {
      title: t("join"),
      links: [
        { href: "/adhesion", label: tNav("membership") },
        { href: "/connexion", label: tLogin("submit") },
      ],
    },
  ];

  return (
    <footer className="relative border-t">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 pt-12 pb-10 sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
        <div className="flex flex-col items-start gap-4">
          <BrandLogo />
          <p className="max-w-[30ch] text-[14px] leading-normal text-pretty text-muted-foreground">{t("tagline")}</p>
        </div>
        {columns.map(({ title, links }) => (
          <nav key={title} aria-label={title} className="flex flex-col gap-3">
            <h2 className={heading}>{title}</h2>
            <ul className="flex flex-col gap-2">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} prefetch={guestOnly.has(href) ? false : undefined} className={link}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="flex flex-col gap-3">
          <h2 className={heading}>{t("contact")}</h2>
          <a href={`mailto:${EMAIL}`} className={link}>
            {EMAIL}
          </a>
          <p className="text-[14px] text-muted-foreground">{t("location")}</p>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-4 text-[12px] text-muted-foreground">
          <p className="flex items-center gap-2">
            <span aria-hidden className="size-1.5 rounded-full bg-psg-red" />
            © PSG Zurich · {t("official")}
          </p>
          <LegalLinks />
        </div>
      </div>
    </footer>
  );
}
