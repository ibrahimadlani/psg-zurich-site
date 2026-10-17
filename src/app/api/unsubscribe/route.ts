import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { routing } from "@/i18n/routing";
import { verifyUnsubscribe, type NotificationType } from "@/lib/unsubscribe";

const COLUMN: Record<NotificationType, "notifyEvents" | "notifyPredictionReminders" | "notifyResults" | "notifyNews"> = {
  events: "notifyEvents",
  reminders: "notifyPredictionReminders",
  results: "notifyResults",
  news: "notifyNews",
};

const localeOf = (value: string | null) =>
  (routing.locales as readonly string[]).includes(value ?? "") ? value! : routing.defaultLocale;

/** Link from an email: never acts on GET (mail scanners open links), shows the confirmation page. */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = new URL(`/${localeOf(params.get("l"))}/unsubscribe`, request.url);
  for (const name of ["m", "t", "s"]) page.searchParams.set(name, params.get(name) ?? "");
  return NextResponse.redirect(page, 303);
}

/** One-click unsubscribe (RFC 8058, mail client button) and the confirmation page's form. */
export async function POST(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const form = await request.formData().catch(() => null);
  const field = (name: string) => query.get(name) ?? (form?.get(name) as string | null) ?? "";
  const memberId = field("m");
  const type = field("t");
  if (!verifyUnsubscribe(memberId, type, field("s"))) return new NextResponse("Invalid link", { status: 400 });

  await db.update(members).set({ [COLUMN[type]]: false }).where(eq(members.id, memberId));

  // Mail clients post "List-Unsubscribe=One-Click" and only need a 2xx.
  if (form?.get("List-Unsubscribe") === "One-Click") return new NextResponse("Unsubscribed");
  const done = new URL(`/${localeOf(field("l"))}/unsubscribe`, request.url);
  done.searchParams.set("done", type);
  return NextResponse.redirect(done, 303);
}
