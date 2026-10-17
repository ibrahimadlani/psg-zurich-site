import { BrandLogo } from "@/components/brand-logo";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { HeaderTools } from "@/components/header-tools";
import { MainNav } from "@/components/main-nav";
import { MobileMenu } from "@/components/mobile-menu";
import { UserNav } from "@/components/user-nav";

export function HeaderActions() {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {/* The shop's bag, on every screen size. */}
      <CartDrawer />
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <HeaderTools />
        <UserNav />
      </div>
      {/* Below md: everything moves into the side menu. */}
      <div className="md:hidden">
        <MobileMenu />
      </div>
    </div>
  );
}

/** Logo on the left; on the right, language and theme (visitors) or notifications and settings (members). */
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
