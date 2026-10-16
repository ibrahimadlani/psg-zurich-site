import { Body, Button, Column, Container, Head, Heading, Html, Img, Link, Preview, Row, Section, Text } from "react-email";
import { INSTAGRAM } from "@/lib/social";

/*
 * The frame of every email, drawn after the site: the club logo on the light page background,
 * one white card with 14 px corners and a hairline border, the PSG band as a bookmark in its
 * corner, the narrow ultrabold italic capitals of the headings, the wide small capitals of the
 * labels and the navy button. Apple Mail and iOS get the site's own fonts and its dark theme;
 * Gmail and Outlook fall back to Helvetica / Arial and the light version.
 */

const SITE = (process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
const ASSETS = `${SITE}/brand/email`;

export const colors = {
  navy: "#004170",
  red: "#da291c",
  page: "#f7f8fa",
  card: "#ffffff",
  ink: "#0a0a0a",
  text: "#404040",
  muted: "#737373",
  border: "#e5e5e5",
} as const;

export const fonts = {
  sans: "Virage, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  wide: "'Virage Wide', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  narrow: "'Virage Narrow', 'Arial Narrow', 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;

const css = `
@font-face { font-family: 'Virage'; font-weight: 400; src: url('${ASSETS}/fonts/Virage-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Virage'; font-weight: 600; src: url('${ASSETS}/fonts/Virage-Semibold.woff2') format('woff2'); }
@font-face { font-family: 'Virage Wide'; font-weight: 600; src: url('${ASSETS}/fonts/Virage-WideSemibold.woff2') format('woff2'); }
@font-face { font-family: 'Virage Narrow'; font-weight: 800; font-style: italic; src: url('${ASSETS}/fonts/Virage-NarrowUltraboldItalic.woff2') format('woff2'); }
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .e-page, .e-page > table > tbody > tr > td, .e-page > table > tr > td { background-color: #0a0a0a !important; background-image: url('${ASSETS}/dots-dark.png') !important; }
  .e-card { background-color: #171717 !important; border-color: #2a2a2a !important; }
  .e-ink { color: #fafafa !important; }
  .e-text { color: #d4d4d4 !important; }
  .e-text strong { color: #fafafa !important; }
  .e-muted, .e-muted a { color: #a3a3a3 !important; }
  .e-rule { border-color: #2a2a2a !important; }
  .e-box { background-color: #0f0f0f !important; border-color: #2a2a2a !important; color: #e5e5e5 !important; }
  .e-link { color: #ffffff !important; }
  .e-button { background-color: #ffffff !important; color: #004170 !important; }
  .e-logo-light { display: none !important; }
  .e-logo-dark { display: block !important; max-height: none !important; overflow: visible !important; }
}
@media (max-width: 480px) {
  .e-head { padding: 28px 8px 0 22px !important; }
  .e-head h1 { font-size: 30px !important; line-height: 29px !important; }
  .e-main { padding: 18px 22px 26px !important; }
  .e-mark { padding-right: 16px !important; }
}
[data-ogsc] .e-logo-light { display: none !important; }
[data-ogsc] .e-logo-dark { display: block !important; max-height: none !important; }
`;

const FOOTER = {
  fr: { club: "Supporters Club officiel du PSG", privacy: "Confidentialité" },
  en: { club: "Official PSG Supporters Club", privacy: "Privacy" },
  de: { club: "Offizieller PSG Supporters Club", privacy: "Datenschutz" },
} as const;

/** Body text of an email (light: dark grey; dark: light grey). */
export const paragraph = {
  color: colors.text,
  fontFamily: fonts.sans,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 14px",
} as const;

/** The navy button, in the wide small capitals of the site's buttons. */
export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: "26px 0 6px" }}>
      <Button
        href={href}
        className="e-button"
        style={{
          backgroundColor: colors.navy,
          color: "#ffffff",
          fontFamily: fonts.wide,
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "15px 22px",
          borderRadius: "10px",
        }}
      >
        {children}&nbsp;&nbsp;→
      </Button>
    </Section>
  );
}

/**
 * Page background, logo, the card (heading next to the bookmark, then `children`), and the
 * club's line under it. `small` is the fine print at the bottom of the card (why you get this,
 * a link that expires…).
 */
export function EmailLayout({
  locale,
  preview,
  heading,
  eyebrow,
  children,
  small,
  unsubscribe,
}: {
  locale: string;
  preview: string;
  heading: string;
  /** Above the heading, as on the event page: the red badge of the kind of event, then the date. */
  eyebrow?: { badge: string; date: string };
  children: React.ReactNode;
  small?: React.ReactNode;
  unsubscribe?: { label: string; url: string };
}) {
  const footer = FOOTER[(locale in FOOTER ? locale : "fr") as keyof typeof FOOTER];
  return (
    <Html lang={locale}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{css}</style>
      </Head>
      <Preview>{preview}</Preview>
      {/* The page background of the site with a fine dot pattern in its colours (a 14 px tile; the
          plain colour where background images are not shown). */}
      <Body
        className="e-page"
        style={{
          backgroundColor: colors.page,
          backgroundImage: `url('${ASSETS}/dots-light.png')`,
          backgroundRepeat: "repeat",
          backgroundSize: "14px 14px",
          margin: 0,
          padding: "28px 12px 40px",
          fontFamily: fonts.sans,
        }}
      >
        <Container style={{ maxWidth: "560px", width: "100%" }}>
          {/* The logo, as on the site: crest, ZÜRICH with its two stars, Supporters Club. */}
          <Section style={{ padding: "0 6px 22px" }}>
            <Link href={`${SITE}/${locale}`} style={{ display: "inline-block" }}>
              <Img className="e-logo-light" src={`${ASSETS}/logo-light.png`} width="161" height="47" alt="PSG Zurich Supporters Club" style={{ display: "block", border: 0 }} />
              {/* Shown instead by the clients that follow the reader's dark mode. */}
              <Img
                className="e-logo-dark"
                src={`${ASSETS}/logo-dark.png`}
                width="161"
                height="47"
                alt=""
                style={{ display: "none", maxHeight: 0, overflow: "hidden", border: 0, msoHide: "all" } as React.CSSProperties}
              />
            </Link>
          </Section>

          <Section className="e-card" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: "14px" }}>
            <Row>
              <Column className="e-head" style={{ padding: "34px 12px 0 32px", verticalAlign: "top" }}>
                {eyebrow ? (
                  <Text style={{ margin: "0 0 14px", lineHeight: "22px" }}>
                    <span
                      style={{
                        backgroundColor: colors.red,
                        borderRadius: "999px",
                        color: "#ffffff",
                        display: "inline-block",
                        fontFamily: fonts.wide,
                        fontSize: "9px",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        lineHeight: "22px",
                        padding: "0 9px",
                        textTransform: "uppercase",
                        verticalAlign: "middle",
                      }}
                    >
                      {eyebrow.badge}
                    </span>
                    <span
                      className="e-muted"
                      style={{
                        color: colors.muted,
                        fontFamily: fonts.wide,
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        marginLeft: "10px",
                        textTransform: "uppercase",
                        verticalAlign: "middle",
                      }}
                    >
                      {eyebrow.date}
                    </span>
                  </Text>
                ) : null}
                <Heading
                  as="h1"
                  className="e-ink"
                  style={{
                    color: colors.ink,
                    fontFamily: fonts.narrow,
                    fontSize: "34px",
                    fontStyle: "italic",
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                    lineHeight: "32px",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  {heading}
                </Heading>
              </Column>
              {/* The PSG band, hanging from the top edge like the next event's bookmark on the site. */}
              <Column className="e-mark" style={{ width: "44px", padding: "0 24px 0 0", verticalAlign: "top" }} align="right">
                <Img src={`${ASSETS}/bookmark.png`} width="20" height="48" alt="" style={{ display: "block", border: 0 }} />
              </Column>
            </Row>
            <Row>
              <Column className="e-main" style={{ padding: "20px 32px 30px" }}>
                {children}
                {small ? (
                  <Text className="e-muted e-rule" style={{ color: colors.muted, fontFamily: fonts.sans, fontSize: "13px", lineHeight: "20px", margin: "22px 0 0", borderTop: `1px solid ${colors.border}`, paddingTop: "16px" }}>
                    {small}
                  </Text>
                ) : null}
              </Column>
            </Row>
          </Section>

          <Section style={{ padding: "22px 8px 0", textAlign: "center" }}>
            <Text className="e-muted" style={{ color: colors.muted, fontFamily: fonts.wide, fontSize: "9.5px", fontWeight: 600, letterSpacing: "0.1em", lineHeight: "16px", margin: 0, textTransform: "uppercase" }}>
              PSG Zurich · {footer.club}
            </Text>
            <Text className="e-muted" style={{ color: colors.muted, fontFamily: fonts.sans, fontSize: "12px", lineHeight: "20px", margin: "6px 0 0" }}>
              <Link href={`${SITE}/${locale}`} style={{ color: colors.muted, textDecoration: "none" }}>
                psg-zurich.ch
              </Link>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <Link href={`${SITE}/${locale}/confidentialite`} style={{ color: colors.muted, textDecoration: "underline" }}>
                {footer.privacy}
              </Link>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <Link href={INSTAGRAM.url} style={{ color: colors.muted, textDecoration: "underline" }}>
                Instagram
              </Link>
              {unsubscribe ? (
                <>
                  &nbsp;&nbsp;·&nbsp;&nbsp;
                  <Link href={unsubscribe.url} style={{ color: colors.muted, textDecoration: "underline" }}>
                    {unsubscribe.label}
                  </Link>
                </>
              ) : null}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
