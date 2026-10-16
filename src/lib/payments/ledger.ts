import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { LEDGER_ACCOUNTS, ledgerEntries, payments, type LedgerAccount, type Locale } from "@/db/schema";
import { todayInZurich } from "@/lib/dues";
import { fiscalYearOf } from "@/lib/money";
import { formatPaymentReference } from "@/lib/payments/config";
import { renderYearReport } from "@/lib/payments/receipt-pdf";

/** Income and costs of the club; payouts only move money from the provider to the bank. */
export const RESULT_ACCOUNTS: LedgerAccount[] = ["dues", "shop", "shipping", "donations", "refunds", "stripe_fees"];

export const ACCOUNT_LABELS: Record<Locale, Record<LedgerAccount, string>> = {
  fr: { dues: "Cotisations", shop: "Boutique", shipping: "Frais de port", donations: "Dons", refunds: "Remboursements", stripe_fees: "Frais de paiement", payouts: "Versements vers la banque" },
  en: { dues: "Membership fees", shop: "Shop", shipping: "Shipping", donations: "Donations", refunds: "Refunds", stripe_fees: "Payment fees", payouts: "Transfers to the bank" },
  de: { dues: "Mitgliederbeiträge", shop: "Shop", shipping: "Versandkosten", donations: "Spenden", refunds: "Rückerstattungen", stripe_fees: "Zahlungsgebühren", payouts: "Überweisungen an die Bank" },
};

/** Financial years that have entries, newest first (the current one always). */
export async function fiscalYears() {
  const rows = await db.selectDistinct({ year: ledgerEntries.fiscalYear }).from(ledgerEntries).orderBy(desc(ledgerEntries.fiscalYear));
  return [...new Set([fiscalYearOf(todayInZurich()), ...rows.map((row) => row.year)])].sort().reverse();
}

/** Totals of a financial year: per account, income, costs, result, and how many payments. */
export async function yearTotals(fiscalYear: string) {
  const rows = await db
    .select({ account: ledgerEntries.account, total: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.fiscalYear, fiscalYear))
    .groupBy(ledgerEntries.account);
  const byAccount = Object.fromEntries(LEDGER_ACCOUNTS.map((account) => [account, 0])) as Record<LedgerAccount, number>;
  for (const row of rows) byAccount[row.account] = Number(row.total);
  const income = byAccount.dues + byAccount.shop + byAccount.shipping + byAccount.donations;
  const [{ value: paid } = { value: 0 }] = await db
    .select({ value: count() })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.fiscalYear, fiscalYear), inArray(ledgerEntries.account, ["dues", "shop", "donations"])));
  return {
    byAccount,
    income,
    refunds: byAccount.refunds,
    fees: byAccount.stripe_fees,
    result: income + byAccount.refunds + byAccount.stripe_fees,
    payouts: byAccount.payouts,
    lines: paid,
  };
}

const csvCell = (value: string | number | null) => {
  const text = value === null ? "" : String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * The year's journal as CSV for the treasurer's spreadsheet: semicolons, amounts in francs with
 * a dot, UTF-8 with its mark so Excel reads the accents.
 */
export async function yearCsv(fiscalYear: string, locale: Locale) {
  const rows = await db
    .select({ entry: ledgerEntries, reference: payments.reference, receipt: payments.receiptNumber, method: payments.method, payer: payments.payerName })
    .from(ledgerEntries)
    .leftJoin(payments, eq(payments.id, ledgerEntries.paymentId))
    .where(eq(ledgerEntries.fiscalYear, fiscalYear))
    .orderBy(asc(ledgerEntries.date), asc(ledgerEntries.createdAt));
  const head = { fr: ["Date", "Exercice", "Compte", "Montant CHF", "Libellé", "Paiement", "Quittance", "Moyen", "Payeur"], en: ["Date", "Year", "Account", "Amount CHF", "Description", "Payment", "Receipt", "Method", "Payer"], de: ["Datum", "Geschäftsjahr", "Konto", "Betrag CHF", "Text", "Zahlung", "Quittung", "Zahlungsart", "Zahler"] }[locale];
  const lines = rows.map(({ entry, reference, receipt, method, payer }) =>
    [entry.date, entry.fiscalYear, ACCOUNT_LABELS[locale][entry.account], (entry.amount / 100).toFixed(2), entry.description, reference ? formatPaymentReference(reference) : "", receipt ?? "", method ?? "", payer ?? ""].map(csvCell).join(";"),
  );
  return `﻿${[head.join(";"), ...lines].join("\r\n")}\r\n`;
}

/** The year's one-page report (PDF) for the general assembly and the auditors. */
export async function yearReportPdf(fiscalYear: string, locale: Locale) {
  const totals = await yearTotals(fiscalYear);
  const labels = ACCOUNT_LABELS[locale];
  const [counts] = await db
    .select({ value: count() })
    .from(payments)
    .where(and(inArray(payments.status, ["succeeded", "partially_refunded", "refunded"]), sql`${payments.paidAt} is not null`));
  return renderYearReport({
    locale,
    fiscalYear,
    issuedAt: new Date(),
    accounts: RESULT_ACCOUNTS.map((account) => ({ label: labels[account], amount: totals.byAccount[account] })),
    total: totals.result,
    counts: [
      { label: { fr: "Écritures de recettes", en: "Income entries", de: "Einnahmebuchungen" }[locale], value: String(totals.lines) },
      { label: { fr: "Paiements encaissés (tous exercices)", en: "Payments received (all years)", de: "Erhaltene Zahlungen (alle Jahre)" }[locale], value: String(counts?.value ?? 0) },
      { label: labels.payouts, value: `CHF ${(totals.payouts / 100).toFixed(2)}` },
    ],
  });
}
