/*
 * Money of the club: integer centimes, in Swiss francs. Shown the Swiss way: "CHF 50.–" for
 * whole francs, "CHF 12.50" otherwise, with ’ between thousands.
 */

export function formatChf(centimes: number, { sign = false }: { sign?: boolean } = {}) {
  const negative = centimes < 0;
  const abs = Math.abs(centimes);
  const francs = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(Math.floor(abs / 100));
  const rest = abs % 100;
  const amount = `${francs}.${rest === 0 ? "–" : String(rest).padStart(2, "0")}`;
  return `${negative ? "−" : sign ? "+" : ""}CHF ${amount}`;
}

/** Club financial year of a date (Zurich): 1 July – 30 June, written "2026/27". */
export function fiscalYearOf(day: string) {
  const [year, month] = day.split("-").map(Number) as [number, number];
  const start = month >= 7 ? year : year - 1;
  return `${start}/${String(start + 1).slice(2)}`;
}
