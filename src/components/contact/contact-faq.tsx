import { useTranslations } from "next-intl";
import { FaqAccordion } from "@/components/contact/faq-accordion";
import { LEGAL } from "@/lib/legal";

/** The questions that come back most, answered before anyone has to write. */
export function ContactFaq() {
  const t = useTranslations("Contact");
  const items = t.raw("faq") as { q: string; a: string }[];
  return (
    <section aria-labelledby="contact-faq" className="space-y-3">
      <h2 id="contact-faq" className="font-wide text-[11px] font-semibold tracking-[0.08em] uppercase">
        {t("faqTitle")}
      </h2>
      <FaqAccordion items={items.map((item) => ({ q: item.q, a: item.a.replace("{fee}", LEGAL.statutes.fee).replace("{juniorFee}", LEGAL.statutes.juniorFee) }))} />
    </section>
  );
}
