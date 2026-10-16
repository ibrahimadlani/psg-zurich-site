import { BareTopBar } from "@/components/bare-top-bar";
import { LegalNav } from "@/components/legal/legal-nav";

/**
 * Statutes, imprint and privacy policy: the frame of the status pages (404, 500), with the slim
 * bar instead of the site header and no announcement banner, and the three documents at the end.
 */
export default function LegalLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div data-bare-page="" className="relative flex flex-1 flex-col leading-[normal]">
      <BareTopBar />
      <main className="mx-auto w-full max-w-5xl flex-1 animate-page-in px-4 pt-6 pb-10 motion-reduce:animate-none">
        {children}
      </main>
      <LegalNav />
    </div>
  );
}
