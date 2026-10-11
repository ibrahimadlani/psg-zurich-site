import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function HeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <LocaleSwitcher />
      <ThemeToggle />
    </div>
  );
}

/** Logo on the left, language and theme switches on the right. */
export function BrandBar() {
  return (
    <div className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-3 p-4">
      <BrandLogo />
      <HeaderActions />
    </div>
  );
}
