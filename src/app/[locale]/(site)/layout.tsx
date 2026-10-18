import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteMain } from "@/components/site-main";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <SiteMain>{children}</SiteMain>
      <SiteFooter />
    </div>
  );
}
