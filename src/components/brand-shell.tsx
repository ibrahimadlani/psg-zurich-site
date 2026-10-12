import { BrandBar } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Full-height page without the main navigation, vertically centred content. */
export function BrandShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden leading-[normal]">
      <header className="relative">
        <BrandBar />
      </header>
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pt-6 pb-12">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
