import { LocaleSwitcher } from "@/components/locale-switcher";
import { MainNav } from "@/components/main-nav";
import { Link } from "@/i18n/navigation";

export function SiteHeader() {
  return (
    <header className="border-b bg-background/95">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            <span className="text-primary">PSG</span>{" "}
            <span className="text-brand-red">Zurich</span>
          </Link>
          <div className="md:hidden">
            <LocaleSwitcher />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MainNav />
          <div className="hidden md:block">
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
