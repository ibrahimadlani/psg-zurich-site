import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Full-height page with vertically centred content (coming soon, sign-in, 404). */
export function BrandShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden leading-[normal]">
      <SiteHeader />
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pt-6 pb-12">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
