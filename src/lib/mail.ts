import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { ReactElement } from "react";
import { render } from "react-email";

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return (transporter = null);

  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  transporter = nodemailer.createTransport({
    host,
    port,
    // 465 = implicit TLS (Infomaniak default); 587 = STARTTLS.
    secure: port === 465,
    auth: user ? { user, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

type SendMailOptions = {
  to: string;
  subject: string;
  react: ReactElement;
  /** One-click unsubscribe link (RFC 8058): mail clients show their own "Unsubscribe" button. */
  unsubscribeUrl?: string;
};

export async function sendMail({ to, subject, react, unsubscribeUrl }: SendMailOptions) {
  const [html, text] = await Promise.all([
    render(react),
    render(react, { plainText: true }),
  ]);

  const smtp = getTransporter();
  if (!smtp) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured (SMTP_HOST is missing).");
    }
    console.info(`[mail] SMTP not configured, email not sent.\nTo: ${to}\nSubject: ${subject}\n\n${text}`);
    return;
  }

  await smtp.sendMail({
    from: process.env.MAIL_FROM ?? "PSG Zurich <noreply@psg-zurich.ch>",
    replyTo: process.env.MAIL_REPLY_TO ?? "contact@psg-zurich.ch",
    to,
    subject,
    html,
    text,
    ...(unsubscribeUrl
      ? { headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }
      : {}),
  });
}
