import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Locale } from "@/db/schema";
import { LEGAL } from "@/lib/legal";
import { formatChf } from "@/lib/money";

/*
 * The club's money documents as PDF: receipts (quittances), credit notes (avoirs) and the yearly
 * report. A4, the site's typefaces and logo, black on white. Fonts and logo come from
 * public/brand/pdf, which ships with the server build.
 */

// TrueType copies of the site fonts (the PDF library cannot read WOFF2).
const ASSETS = path.join(process.cwd(), "public", "brand", "pdf");
const INK = rgb(0.04, 0.04, 0.04);
const MUTED = rgb(0.45, 0.45, 0.45);
const RULE = rgb(0.9, 0.9, 0.9);
const NAVY = rgb(0, 0.255, 0.439);
const RED = rgb(0.855, 0.161, 0.11);
const A4 = [595.28, 841.89] as const;
const MARGIN = 56;

const TEXT = {
  fr: {
    receipt: "Quittance",
    creditNote: "Avoir",
    report: "Comptes de l'exercice",
    number: "N°",
    date: "Date",
    receivedFrom: "Reçu de",
    refundedTo: "Remboursé à",
    description: "Désignation",
    quantity: "Qté",
    unit: "Prix",
    amount: "Montant",
    total: "Total",
    paidWith: "Payé le {date} · {method}",
    refundedWith: "Remboursé le {date} · {method}",
    reference: "Référence {reference}",
    relatesTo: "Se rapporte à la quittance {number}",
    reason: "Motif : {reason}",
    vat: "Association à but non lucratif, non assujettie à la TVA.",
    proof: "Ce document tient lieu de quittance.",
    proofCredit: "Ce document tient lieu d'avoir.",
  },
  en: {
    receipt: "Receipt",
    creditNote: "Credit note",
    report: "Accounts of the financial year",
    number: "No.",
    date: "Date",
    receivedFrom: "Received from",
    refundedTo: "Refunded to",
    description: "Description",
    quantity: "Qty",
    unit: "Price",
    amount: "Amount",
    total: "Total",
    paidWith: "Paid on {date} · {method}",
    refundedWith: "Refunded on {date} · {method}",
    reference: "Reference {reference}",
    relatesTo: "Relates to receipt {number}",
    reason: "Reason: {reason}",
    vat: "Non-profit association, not registered for VAT.",
    proof: "This document serves as a receipt.",
    proofCredit: "This document serves as a credit note.",
  },
  de: {
    receipt: "Quittung",
    creditNote: "Gutschrift",
    report: "Jahresrechnung",
    number: "Nr.",
    date: "Datum",
    receivedFrom: "Erhalten von",
    refundedTo: "Zurückerstattet an",
    description: "Bezeichnung",
    quantity: "Menge",
    unit: "Preis",
    amount: "Betrag",
    total: "Total",
    paidWith: "Bezahlt am {date} · {method}",
    refundedWith: "Zurückerstattet am {date} · {method}",
    reference: "Referenz {reference}",
    relatesTo: "Bezieht sich auf Quittung {number}",
    reason: "Grund: {reason}",
    vat: "Gemeinnütziger Verein, nicht mehrwertsteuerpflichtig.",
    proof: "Dieses Dokument gilt als Quittung.",
    proofCredit: "Dieses Dokument gilt als Gutschrift.",
  },
} as const;

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

type Fonts = { regular: PDFFont; semibold: PDFFont; wide: PDFFont; display: PDFFont };

async function setUp() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regular, semibold, wide, display, logo] = await Promise.all([
    readFile(path.join(ASSETS, "Virage-Regular.ttf")),
    readFile(path.join(ASSETS, "Virage-Semibold.ttf")),
    readFile(path.join(ASSETS, "Virage-WideSemibold.ttf")),
    readFile(path.join(ASSETS, "Virage-NarrowUltraboldItalic.ttf")),
    readFile(path.join(ASSETS, "logo.png")),
  ]);
  // Whole fonts: subsetting garbles the glyphs of these files.
  const fonts: Fonts = {
    regular: await doc.embedFont(regular, { subset: false }),
    semibold: await doc.embedFont(semibold, { subset: false }),
    wide: await doc.embedFont(wide, { subset: false }),
    display: await doc.embedFont(display, { subset: false }),
  };
  return { doc, fonts, logo: await doc.embedPng(logo) };
}

/** Text right-aligned on `right`. */
function drawRight(page: PDFPage, text: string, right: number, y: number, font: PDFFont, size: number, color = INK) {
  page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, font, size, color });
}

/** Cuts a text to the width it has (with an ellipsis). */
function fit(text: string, font: PDFFont, size: number, width: number) {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let cut = text;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, size) > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/** Logo on the left, the club's address on the right, a hairline under them. */
function header(page: PDFPage, fonts: Fonts, logo: Awaited<ReturnType<PDFDocument["embedPng"]>>) {
  const [width, height] = A4;
  const logoWidth = 140;
  page.drawImage(logo, { x: MARGIN, y: height - MARGIN - logoWidth * (logo.height / logo.width), width: logoWidth, height: logoWidth * (logo.height / logo.width) });
  const lines = [LEGAL.association, LEGAL.street, `${LEGAL.postcode} ${LEGAL.city}`, LEGAL.country, LEGAL.email, ...(LEGAL.uid ? [LEGAL.uid] : [])];
  lines.forEach((line, index) => drawRight(page, line, width - MARGIN, height - MARGIN - 8 - index * 12, index === 0 ? fonts.semibold : fonts.regular, 8.5, index === 0 ? INK : MUTED));
  page.drawLine({ start: { x: MARGIN, y: height - 140 }, end: { x: width - MARGIN, y: height - 140 }, thickness: 0.6, color: RULE });
}

/** The two PSG bands at the bottom edge, and the legal lines above them. */
function footer(page: PDFPage, fonts: Fonts, lines: string[]) {
  const [width] = A4;
  lines.forEach((line, index) => page.drawText(line, { x: MARGIN, y: 70 - index * 11, font: fonts.regular, size: 8, color: MUTED }));
  page.drawRectangle({ x: width - MARGIN - 18, y: 0, width: 8, height: 40, color: RED });
  page.drawRectangle({ x: width - MARGIN - 6, y: 0, width: 8, height: 40, color: NAVY });
}

export type MoneyDocument = {
  kind: "receipt" | "creditNote";
  locale: Locale;
  number: string;
  issuedAt: Date;
  payer: { name: string; email: string };
  lines: { description: string; quantity: number; unitAmount: number; total: number }[];
  total: number;
  /** "Visa •••• 4242", "TWINT", "Virement bancaire"… */
  method: string;
  reference: string;
  /** Credit note: the receipt it corrects, and why. */
  relatesTo?: string;
  reason?: string;
};

export async function renderMoneyDocument(document: MoneyDocument) {
  const t = TEXT[document.locale];
  const { doc, fonts, logo } = await setUp();
  doc.setTitle(`${document.kind === "receipt" ? t.receipt : t.creditNote} ${document.number}`);
  doc.setAuthor(LEGAL.association);
  doc.setCreationDate(document.issuedAt);
  const page = doc.addPage([...A4]);
  const [width, height] = A4;
  header(page, fonts, logo);

  const date = new Intl.DateTimeFormat(document.locale, { timeZone: "Europe/Zurich", day: "numeric", month: "long", year: "numeric" }).format(document.issuedAt);
  let y = height - 200;
  page.drawText((document.kind === "receipt" ? t.receipt : t.creditNote).toUpperCase(), { x: MARGIN, y, font: fonts.display, size: 34, color: INK });
  drawRight(page, `${t.number} ${document.number}`, width - MARGIN, y + 16, fonts.semibold, 11);
  drawRight(page, `${t.date} ${date}`, width - MARGIN, y, fonts.regular, 10, MUTED);

  y -= 46;
  page.drawText((document.kind === "receipt" ? t.receivedFrom : t.refundedTo).toUpperCase(), { x: MARGIN, y, font: fonts.wide, size: 7.5, color: MUTED });
  page.drawText(document.payer.name, { x: MARGIN, y: y - 16, font: fonts.semibold, size: 12, color: INK });
  page.drawText(document.payer.email, { x: MARGIN, y: y - 31, font: fonts.regular, size: 10, color: MUTED });

  // Lines.
  y -= 72;
  const columns = { quantity: width - MARGIN - 200, unit: width - MARGIN - 110, amount: width - MARGIN };
  page.drawText(t.description.toUpperCase(), { x: MARGIN, y, font: fonts.wide, size: 7.5, color: MUTED });
  drawRight(page, t.quantity.toUpperCase(), columns.quantity, y, fonts.wide, 7.5, MUTED);
  drawRight(page, t.unit.toUpperCase(), columns.unit, y, fonts.wide, 7.5, MUTED);
  drawRight(page, t.amount.toUpperCase(), columns.amount, y, fonts.wide, 7.5, MUTED);
  y -= 10;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 0.6, color: RULE });
  for (const line of document.lines) {
    y -= 20;
    page.drawText(fit(line.description, fonts.regular, 10.5, columns.quantity - MARGIN - 40), { x: MARGIN, y, font: fonts.regular, size: 10.5, color: INK });
    drawRight(page, String(line.quantity), columns.quantity, y, fonts.regular, 10.5);
    drawRight(page, formatChf(line.unitAmount), columns.unit, y, fonts.regular, 10.5);
    drawRight(page, formatChf(line.total), columns.amount, y, fonts.regular, 10.5);
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 0.4, color: RULE });
  }
  y -= 28;
  page.drawText(t.total.toUpperCase(), { x: columns.unit - 80, y, font: fonts.wide, size: 9, color: INK });
  drawRight(page, formatChf(document.total), columns.amount, y - 2, fonts.display, 22);

  // How it was paid, and the references.
  y -= 48;
  const notes = [
    fill(document.kind === "receipt" ? t.paidWith : t.refundedWith, { date, method: document.method }),
    fill(t.reference, { reference: document.reference }),
    ...(document.relatesTo ? [fill(t.relatesTo, { number: document.relatesTo })] : []),
    ...(document.reason ? [fill(t.reason, { reason: document.reason })] : []),
  ];
  notes.forEach((note, index) => page.drawText(fit(note, fonts.regular, 10, width - 2 * MARGIN), { x: MARGIN, y: y - index * 15, font: fonts.regular, size: 10, color: index === 0 ? INK : MUTED }));

  footer(page, fonts, [t.vat, document.kind === "receipt" ? t.proof : t.proofCredit]);
  return Buffer.from(await doc.save());
}

export type YearReport = {
  locale: Locale;
  fiscalYear: string;
  issuedAt: Date;
  /** Totals per account, in centimes (income positive, costs negative). */
  accounts: { label: string; amount: number }[];
  total: number;
  counts: { label: string; value: string }[];
};

/** One page for the general assembly and the auditors: the year's totals by account. */
export async function renderYearReport(report: YearReport) {
  const t = TEXT[report.locale];
  const { doc, fonts, logo } = await setUp();
  doc.setTitle(`${t.report} ${report.fiscalYear}`);
  doc.setAuthor(LEGAL.association);
  const page = doc.addPage([...A4]);
  const [width, height] = A4;
  header(page, fonts, logo);
  let y = height - 200;
  page.drawText(t.report.toUpperCase(), { x: MARGIN, y, font: fonts.display, size: 30, color: INK });
  drawRight(page, report.fiscalYear, width - MARGIN, y + 6, fonts.semibold, 14);
  y -= 50;
  for (const account of report.accounts) {
    page.drawText(account.label, { x: MARGIN, y, font: fonts.regular, size: 11, color: INK });
    drawRight(page, formatChf(account.amount), width - MARGIN, y, fonts.regular, 11, account.amount < 0 ? RED : INK);
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 0.4, color: RULE });
    y -= 18;
  }
  y -= 8;
  page.drawText(t.total.toUpperCase(), { x: MARGIN, y, font: fonts.wide, size: 9, color: INK });
  drawRight(page, formatChf(report.total), width - MARGIN, y - 2, fonts.display, 22);
  y -= 48;
  for (const count of report.counts) {
    page.drawText(count.label, { x: MARGIN, y, font: fonts.regular, size: 10, color: MUTED });
    drawRight(page, count.value, width - MARGIN, y, fonts.regular, 10, MUTED);
    y -= 15;
  }
  const date = new Intl.DateTimeFormat(report.locale, { timeZone: "Europe/Zurich", dateStyle: "long" }).format(report.issuedAt);
  footer(page, fonts, [t.vat, `${t.date} ${date}`]);
  return Buffer.from(await doc.save());
}
