import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";

/**
 * Slim bar of the sign-in screens, symmetrical around the centred club logo: a discreet way
 * back (home, or `back`) on the left, the language and theme switches on the right.
 */
export function BareTopBar({ back }: { back?: { href: string; label: string } } = {}) {
  const t = useTranslations("Nav");
  return (
    <div className="relative z-10 mx-auto grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-[clamp(12px,3vw,16px)]">
      <Link
        href={back?.href ?? "/"}
        className="group inline-flex items-center gap-1.5 justify-self-start rounded-md py-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft
          aria-hidden
          className="size-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none"
          strokeWidth={1.75}
        />
        <span className="max-sm:sr-only">{back?.label ?? t("home")}</span>
      </Link>
      <BrandLogo />
      <div className="flex items-center gap-1 justify-self-end">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </div>
  );
}
