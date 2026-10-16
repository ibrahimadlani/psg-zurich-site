import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { duesRates } from "@/db/schema";
import { isJunior, todayInZurich } from "@/lib/dues";
import { fiscalYearOf } from "@/lib/money";

/** Until the committee sets the season's fee in the admin (statutes: adult and junior). */
export const DEFAULT_DUES = { adult: 5000, junior: 2500 } as const;

/** Season running today ("2026/27"): the fee paid now covers it. */
export const currentSeason = () => fiscalYearOf(todayInZurich());

export async function seasonRates(season = currentSeason()) {
  const [row] = await db.select().from(duesRates).where(eq(duesRates.season, season));
  return { season, adult: row?.adultAmount ?? DEFAULT_DUES.adult, junior: row?.juniorAmount ?? DEFAULT_DUES.junior, set: Boolean(row) };
}

/** What this member pays for the season: junior rate under 18. */
export async function duesPriceFor(member: { birthDate: string | null }) {
  const rates = await seasonRates();
  const junior = isJunior(member.birthDate);
  return { season: rates.season, junior, amount: junior ? rates.junior : rates.adult };
}
