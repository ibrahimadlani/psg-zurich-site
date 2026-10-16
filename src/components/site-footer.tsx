"use client";

import { Mail, MapPin } from "lucide-react";
import { SignInLink } from "@/components/auth/sign-in-link";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand-logo";
import { InstagramIcon } from "@/components/instagram-icon";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { INSTAGRAM } from "@/lib/social";

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
    <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
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
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-x-6 gap-y-2 px-4 py-4 text-center text-[12px] text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-between sm:text-left">
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
        { href: "/soutenir", label: t("support") },
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
                  {/* Sign in: back to this page afterwards. */}
                  {href === "/connexion" ? (
                    <SignInLink className={link}>{label}</SignInLink>
                  ) : (
                    <Link href={href} prefetch={guestOnly.has(href) ? false : undefined} className={link}>
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="flex flex-col gap-3">
          <h2 className={heading}>{t("contact")}</h2>
          <a href={`mailto:${EMAIL}`} className={`${link} inline-flex items-center gap-1.5`}>
            <Mail className="size-3.5 shrink-0" aria-hidden />
            {EMAIL}
          </a>
          <a href={INSTAGRAM.url} target="_blank" rel="noreferrer" className={`${link} inline-flex items-center gap-1.5`}>
            <InstagramIcon className="size-3.5" />
            {INSTAGRAM.handle}
          </a>
          <p className="inline-flex items-center gap-1.5 text-[14px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {t("location")}
          </p>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-x-6 gap-y-2 px-4 py-4 text-center text-[12px] text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-between sm:text-left">
          <p>© PSG Zurich · {t("official")}</p>
          <LegalLinks />
        </div>
      </div>
    </footer>
  );
}
