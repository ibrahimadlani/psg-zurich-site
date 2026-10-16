import { Link, Text } from "react-email";
import { colors, EmailButton, EmailLayout, fonts, paragraph } from "@/emails/email-layout";
import { parseInline, type InlineNode } from "@/lib/article-blocks";

export type ClubEmailProps = {
  locale: string;
  preview: string;
  heading: string;
  /** Safe inline syntax (**bold**, *italic*, [link](url)); blank lines start a new paragraph. */
  body: string;
  /** Short line under the text: date and place of an event, a score… */
  info?: string;
  /** Someone's own words, quoted with their line breaks. */
  quote?: string;
  cta?: { label: string; url: string };
  /** Event emails: kind of event and date, above the heading. */
  eyebrow?: { badge: string; date: string };
  footer?: string;
  unsubscribe?: { label: string; url: string };
};

function Inline({ nodes }: { nodes: InlineNode[] }) {
  return nodes.map((node, index) => {
    if (node.kind === "text") return node.text;
    if (node.kind === "bold")
      return (
        <strong key={index} style={{ color: colors.ink, fontWeight: 600 }}>
          <Inline nodes={node.children} />
        </strong>
      );
    if (node.kind === "italic") return <em key={index}><Inline nodes={node.children} /></em>;
    return (
      <Link key={index} href={node.href} className="e-link" style={{ color: colors.navy, textDecoration: "underline" }}>
        <Inline nodes={node.children} />
      </Link>
    );
  });
}

const box = {
  backgroundColor: colors.page,
  border: `1px solid ${colors.border}`,
  borderRadius: "10px",
  fontFamily: fonts.sans,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "18px 0 0",
  padding: "12px 16px",
} as const;

/** Every email of the mailing (automations and campaigns), in the site's frame (emails/email-layout). */
export function ClubEmail({ locale, preview, heading, body, info, quote, cta, eyebrow, footer, unsubscribe }: ClubEmailProps) {
  const paragraphs = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  return (
    <EmailLayout
      locale={locale}
      preview={preview}
      heading={heading}
      eyebrow={eyebrow}
      unsubscribe={unsubscribe}
      small={footer ? <Inline nodes={parseInline(footer)} /> : undefined}
    >
      {paragraphs.map((part, index) => (
        <Text key={index} className="e-text" style={paragraph}>
          {part.split("\n").map((line, lineIndex) => (
            <span key={lineIndex}>
              {lineIndex > 0 ? <br /> : null}
              <Inline nodes={parseInline(line)} />
            </span>
          ))}
        </Text>
      ))}
      {info ? (
        <Text className="e-box e-ink" style={{ ...box, color: colors.ink, fontWeight: 600 }}>
          {info}
        </Text>
      ) : null}
      {quote ? (
        <Text className="e-box e-text" style={{ ...box, color: colors.text, whiteSpace: "pre-line", borderLeft: `3px solid ${colors.navy}`, borderRadius: "0 10px 10px 0" }}>
          {quote}
        </Text>
      ) : null}
      {cta ? <EmailButton href={cta.url}>{cta.label}</EmailButton> : null}
    </EmailLayout>
  );
}
