import { MainNav } from "@/components/main-nav";
import { BrandBar } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <BrandBar />
        <div className="mx-auto w-full max-w-5xl px-4 pb-2">
          <MainNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
