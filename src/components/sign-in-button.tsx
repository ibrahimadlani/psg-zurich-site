"use client";

import { ArrowRight, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/** Header call to action. Goes to the member area, which sends signed-out visitors to /connexion. */
export function SignInButton() {
  const t = useTranslations("Login");
  const pathname = usePathname();
  if (pathname.startsWith("/connexion")) return null;

  return (
    <Link
      href="/espace-membre"
      aria-label={t("submit")}
      className="group inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-segment px-2.5 font-wide text-[10px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand [transition:opacity_.2s,transform_.15s] hover:opacity-90 active:scale-[0.96] sm:px-3"
    >
      <LogIn className="size-3.5 sm:hidden" aria-hidden />
      <span className="hidden sm:inline">{t("submit")}</span>
      <ArrowRight
        className="hidden size-3 transition-transform duration-200 group-hover:translate-x-0.5 sm:block"
        aria-hidden
      />
    </Link>
  );
}
