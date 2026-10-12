import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MainNav } from "@/components/main-nav";
import { MobileMenu } from "@/components/mobile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";

export function HeaderActions() {
  return (
    <>
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <LocaleSwitcher />
        <ThemeToggle />
        <UserNav />
      </div>
      {/* Below md: everything moves into the side menu. */}
      <div className="md:hidden">
        <MobileMenu />
      </div>
    </>
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

/** Header of every page: brand bar, then (from md) the navigation bar. */
export function SiteHeader() {
  return (
    <header className="relative">
      <BrandBar />
      <MainNav />
    </header>
  );
}
