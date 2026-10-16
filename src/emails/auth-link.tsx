import { Text } from "react-email";
import { EmailButton, EmailLayout, paragraph } from "@/emails/email-layout";

export type AuthLinkEmailProps = {
  /** Button target; no button without it. */
  url?: string;
  locale: string;
  texts: {
    preview: string;
    heading: string;
    body: string;
    cta?: string;
    /** Small print under the separator. */
    ignore: string;
  };
};

/** Sign-in emails (address confirmation, password, magic link), in the same frame as the club's. */
export function AuthLinkEmail({ url, locale, texts }: AuthLinkEmailProps) {
  return (
    <EmailLayout locale={locale} preview={texts.preview} heading={texts.heading} small={texts.ignore}>
      <Text className="e-text" style={paragraph}>
        {texts.body}
      </Text>
      {url && texts.cta ? <EmailButton href={url}>{texts.cta}</EmailButton> : null}
    </EmailLayout>
  );
}
