import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WaitingPage } from "@/components/home/waiting-page";

/*
 * The waiting page ("Opening soon"), on its own (no site header): visitors reach it at the
 * home address while the committee keeps the site closed (the proxy rewrites "/" here).
 */

export async function generateMetadata(): Promise<Metadata> {
  const [waiting, site] = await Promise.all([getTranslations("ComingSoon"), getTranslations("Metadata")]);
  return { title: { absolute: `${waiting("title")} · ${site("title")}` } };
}

export default function ComingSoonPage() {
  return <WaitingPage />;
}
