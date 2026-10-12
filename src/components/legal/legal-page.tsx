import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { LEGAL_DOCUMENTS, type LegalBlock, type LegalDocumentKey } from "@/content/legal";
import { LEGAL } from "@/lib/legal";

export async function legalMetadata(key: LegalDocumentKey): Promise<Metadata> {
  const document = LEGAL_DOCUMENTS[key][await getLocale()];
  return { title: document.title, description: document.intro };
}

const linkClass = "text-foreground underline decoration-foreground/25 underline-offset-[3px] transition-colors hover:decoration-brand-red";

// Emails and https URLs inside the texts become links.
function RichText({ text }: { text: string }) {
  return text.split(/([\w.+-]+@[\w-]+\.[\w.]+|https:\/\/\S+)/g).map((part, index) => {
    if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>;
    const isEmail = !part.startsWith("https://");
    return (
      <a
        key={index}
        href={isEmail ? `mailto:${part}` : part}
        {...(isEmail ? {} : { target: "_blank", rel: "noreferrer" })}
        className={linkClass}
      >
        {isEmail ? part : part.replace(/^https:\/\/(www\.)?/, "")}
      </a>
    );
  });
}

function Block({ block }: { block: LegalBlock }) {
  if ("p" in block) {
    return (
      <p>
        <RichText text={block.p} />
      </p>
    );
  }
  if ("ul" in block) {
    return (
      <ul className="space-y-2">
        {block.ul.map((item) => (
          <li key={item} className="relative pl-5">
            <span aria-hidden className="absolute top-[0.7em] left-0 h-px w-2.5 bg-psg-red" />
            <RichText text={item} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <dl className="divide-y rounded-[10px] border bg-card/60">
      {block.dl.map(([label, value]) => (
        <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-4">
          <dt className="font-wide text-[10px] leading-[1.9] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {label}
          </dt>
          <dd className="text-foreground">
            <RichText text={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Legal document (imprint or privacy policy): title, table of contents, numbered sections. */
export async function LegalPage({ document: key }: { document: LegalDocumentKey }) {
  const locale = await getLocale();
  const t = await getTranslations("Legal");
  const format = await getFormatter();
  const document = LEGAL_DOCUMENTS[key][locale];
  const number = (index: number) => String(index + 1).padStart(2, "0");

  return (
    <article>
      <header className="flex flex-col gap-4 border-b pb-10">
        <p className="flex items-center gap-2 font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-psg-red" />
          {t("eyebrow")}
        </p>
        <h1 className="font-narrow text-[length:clamp(40px,8vw,64px)] leading-[0.9] font-extrabold uppercase italic">
          {document.title}
        </h1>
        <p className="max-w-[60ch] text-[16px] leading-relaxed text-pretty text-muted-foreground">{document.intro}</p>
        <p className="text-[13px] text-muted-foreground">
          {t("updated", { date: format.dateTime(new Date(`${LEGAL.updatedAt}T12:00:00Z`), { dateStyle: "long" }) })}
        </p>
      </header>

      <div className="grid gap-10 pt-10 md:grid-cols-[13rem_1fr] md:gap-14">
        <nav aria-label={t("onThisPage")} className="hidden md:block">
          <div className="sticky top-8 flex flex-col gap-3">
            <p className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {t("onThisPage")}
            </p>
            <ol className="flex flex-col gap-2 border-l">
              {document.sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px flex gap-2.5 border-l border-transparent pl-3 text-[13px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                  >
                    <span className="font-mono text-[11px] leading-[1.7] opacity-60">{number(index)}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="flex min-w-0 flex-col">
          {document.sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="scroll-mt-8 border-b py-8 first:pt-0 last:border-b-0"
            >
              <h2 id={`${section.id}-title`} className="mb-4 flex items-baseline gap-3 text-[20px] font-semibold tracking-tight">
                <span className="font-mono text-[12px] font-normal text-psg-red">{number(index)}</span>
                {section.title}
              </h2>
              <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-muted-foreground">
                {section.blocks.map((block, blockIndex) => (
                  <Block key={blockIndex} block={block} />
                ))}
              </div>
            </section>
          ))}

          <aside className="mt-6 flex flex-col gap-1 rounded-[10px] border bg-card/60 px-5 py-4 text-[14px] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-muted-foreground">{t(`question.${key}`)}</span>
            <a href={`mailto:${LEGAL.email}`} className={linkClass}>
              {LEGAL.email}
            </a>
          </aside>
        </div>
      </div>
    </article>
  );
}
