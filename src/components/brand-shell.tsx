import { BrandBar } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Full-height page without the main navigation: dotted backdrop, vertically centred content. */
export function BrandShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden leading-[normal]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-dots" />
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
