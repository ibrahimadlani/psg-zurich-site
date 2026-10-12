import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignInButton } from "@/components/sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";

export function HeaderActions() {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <LocaleSwitcher />
      <ThemeToggle />
      <SignInButton />
    </div>
  );
}

/** Logo on the left, language and theme switches on the right. */
export function BrandBar() {
  return (
    <div className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-[clamp(12px,3vw,16px)]">
      <BrandLogo />
      <HeaderActions />
    </div>
  );
}
