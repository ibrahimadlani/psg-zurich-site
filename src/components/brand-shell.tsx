import { BrandBar } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Full-height page without the main navigation: dotted backdrop, centred content. */
export function BrandShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden leading-[normal]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-dots" />
      <header className="relative">
        <BrandBar />
      </header>
      <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-4 pt-6 pb-12 text-center">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
