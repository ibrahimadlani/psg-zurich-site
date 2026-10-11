import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

export type AuthLinkEmailProps = {
  url: string;
  locale: string;
  texts: {
    preview: string;
    heading: string;
    body: string;
    cta: string;
    ignore: string;
  };
};

const navy = "#004170";
const red = "#DA291C";

export function AuthLinkEmail({ url, locale, texts }: AuthLinkEmailProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{texts.preview}</Preview>
      <Body style={{ backgroundColor: "#f4f5f7", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "32px auto", padding: "32px", maxWidth: "520px", borderTop: `4px solid ${red}` }}>
          <Text style={{ color: navy, fontSize: "20px", fontWeight: 700, margin: 0 }}>
            PSG Zurich
          </Text>
          <Heading as="h1" style={{ color: "#111827", fontSize: "22px" }}>
            {texts.heading}
          </Heading>
          <Text style={{ color: "#374151", fontSize: "15px", lineHeight: "24px" }}>
            {texts.body}
          </Text>
          <Section style={{ margin: "24px 0" }}>
            <Button
              href={url}
              style={{ backgroundColor: navy, color: "#ffffff", padding: "12px 20px", borderRadius: "6px", fontWeight: 600 }}
            >
              {texts.cta}
            </Button>
          </Section>
          <Hr />
          <Text style={{ color: "#6b7280", fontSize: "13px" }}>{texts.ignore}</Text>
        </Container>
      </Body>
    </Html>
  );
}
