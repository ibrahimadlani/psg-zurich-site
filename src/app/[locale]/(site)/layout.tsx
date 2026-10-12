import { ViewTransition } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {/* Header and nav stay put; only the content fades between pages. */}
        <ViewTransition default="page">{children}</ViewTransition>
      </main>
      <SiteFooter />
    </div>
  );
}
