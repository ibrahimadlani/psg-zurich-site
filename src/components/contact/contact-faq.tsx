import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { LEGAL } from "@/lib/legal";

/** The questions that come back most, answered before anyone has to write (native accordions). */
export function ContactFaq() {
  const t = useTranslations("Contact");
  const items = t.raw("faq") as { q: string; a: string }[];
  return (
    <section aria-labelledby="contact-faq" className="space-y-3">
      <h2 id="contact-faq" className="font-wide text-[11px] font-semibold tracking-[0.08em] uppercase">
        {t("faqTitle")}
      </h2>
      <div className="divide-y overflow-hidden rounded-[14px] border bg-card">
        {items.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 text-pretty">{item.q}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
            </summary>
            <p className="px-4 pb-4 text-[15px] leading-relaxed text-pretty text-muted-foreground">
              {item.a.replace("{fee}", LEGAL.statutes.fee).replace("{juniorFee}", LEGAL.statutes.juniorFee)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
