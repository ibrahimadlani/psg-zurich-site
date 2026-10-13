import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "react-email";
import { parseInline, type InlineNode } from "@/lib/article-blocks";

export type ClubEmailProps = {
  locale: string;
  preview: string;
  heading: string;
  /** Safe inline syntax (**bold**, *italic*, [link](url)); blank lines start a new paragraph. */
  body: string;
  /** Short line under the text: date and place of an event, a score… */
  info?: string;
  cta?: { label: string; url: string };
  footer?: string;
  unsubscribe?: { label: string; url: string };
};

const navy = "#004170";
const red = "#DA291C";
const paragraph = { color: "#374151", fontSize: "15px", lineHeight: "24px", margin: "0 0 14px" };

function Inline({ nodes }: { nodes: InlineNode[] }) {
  return nodes.map((node, index) => {
    if (node.kind === "text") return node.text;
    if (node.kind === "bold") return <strong key={index}><Inline nodes={node.children} /></strong>;
    if (node.kind === "italic") return <em key={index}><Inline nodes={node.children} /></em>;
    return (
      <Link key={index} href={node.href} style={{ color: navy, textDecoration: "underline" }}>
        <Inline nodes={node.children} />
      </Link>
    );
  });
}

/** Layout of every email of the mailing (automations and campaigns), in the club colours. */
export function ClubEmail({ locale, preview, heading, body, info, cta, footer, unsubscribe }: ClubEmailProps) {
  const paragraphs = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f4f5f7", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "32px auto", padding: "32px", maxWidth: "520px", borderTop: `4px solid ${red}` }}>
          <Text style={{ color: navy, fontSize: "20px", fontWeight: 700, margin: 0 }}>PSG Zurich</Text>
          <Heading as="h1" style={{ color: "#111827", fontSize: "22px" }}>
            {heading}
          </Heading>
          {paragraphs.map((part, index) => (
            <Text key={index} style={paragraph}>
              {part.split("\n").map((line, lineIndex) => (
                <span key={lineIndex}>
                  {lineIndex > 0 ? <br /> : null}
                  <Inline nodes={parseInline(line)} />
                </span>
              ))}
            </Text>
          ))}
          {info ? (
            <Text style={{ ...paragraph, color: "#111827", fontWeight: 600, borderLeft: `3px solid ${navy}`, paddingLeft: "12px" }}>
              {info}
            </Text>
          ) : null}
          {cta ? (
            <Section style={{ margin: "24px 0" }}>
              <Button href={cta.url} style={{ backgroundColor: navy, color: "#ffffff", padding: "12px 20px", borderRadius: "6px", fontWeight: 600 }}>
                {cta.label}
              </Button>
            </Section>
          ) : null}
          {footer || unsubscribe ? <Hr /> : null}
          {footer ? (
            <Text style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 6px" }}>
              <Inline nodes={parseInline(footer)} />
            </Text>
          ) : null}
          {unsubscribe ? (
            <Text style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}>
              <Link href={unsubscribe.url} style={{ color: "#6b7280", textDecoration: "underline" }}>
                {unsubscribe.label}
              </Link>
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}
