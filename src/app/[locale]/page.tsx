import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { MemberDashboard, MemberFeed, MemberMatchday } from "@/components/home/variants";
import { WaitingPage } from "@/components/home/waiting-page";
import { VisitorLanding } from "@/components/landing/landing-page";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HOME_MEMBER_VARIANTS, HOME_VISITOR_VARIANTS, type HomeMemberVariant, type HomeVisitorVariant, type Locale } from "@/db/schema";
import { clubFigures, homeBasics, homeMemberExtras, homeViewer } from "@/lib/home";
import { getSession } from "@/lib/permissions";
import { can } from "@/lib/roles";
import { getHomeSettings } from "@/lib/site-settings";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Which home this request gets: the committee's choice (Admin › Settings) for visitors or for
 * members; the committee itself can preview any variant with ?variante=… (and see the
 * visitors' side with ?vue=visiteur).
 */
async function choose(searchParams: SearchParams) {
  const [viewer, settings, params] = await Promise.all([homeViewer(), getHomeSettings(), searchParams]);
  const committee = Boolean(viewer.session && can(viewer.session.user.role, "area"));
  const asked = committee && typeof params.variante === "string" ? params.variante : null;
  const asVisitor = !viewer.session || (committee && params.vue === "visiteur") || (asked !== null && (HOME_VISITOR_VARIANTS as readonly string[]).includes(asked) && !(HOME_MEMBER_VARIANTS as readonly string[]).includes(asked));
  if (asVisitor) {
    const variant: HomeVisitorVariant = asked && (HOME_VISITOR_VARIANTS as readonly string[]).includes(asked) ? (asked as HomeVisitorVariant) : settings.visitor;
    // A member previewing the visitors' page sees it as a visitor would.
    return { side: "visitor" as const, variant, viewer: viewer.session ? { ...viewer, session: null, member: null, access: "guest" as const } : viewer };
  }
  const variant: HomeMemberVariant = asked && (HOME_MEMBER_VARIANTS as readonly string[]).includes(asked) ? (asked as HomeMemberVariant) : settings.member;
  return { side: "member" as const, variant, viewer };
}

export async function generateMetadata(): Promise<Metadata> {
  // Depends on the visitor and the committee's setting: decided at request time.
  await connection();
  const [settings, session, waiting, site] = await Promise.all([getHomeSettings(), getSession(), getTranslations("ComingSoon"), getTranslations("Metadata")]);
  // The layout's title template only applies to child segments, not to this page.
  if (!session && settings.visitor === "coming_soon") return { title: { absolute: `${waiting("title")} · ${site("title")}` } };
  return { title: { absolute: site("title") }, description: site("description") };
}

async function Home({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const [choice, locale] = await Promise.all([choose(searchParams), getLocale()]);
  if (choice.side === "visitor" && choice.variant === "coming_soon") return <WaitingPage />;

  const basics = await homeBasics(choice.viewer, locale as Locale);
  // The landing page runs edge to edge: its sections set their own width.
  if (choice.side === "visitor") {
    return (
      <div className="flex flex-1 flex-col">
        <SiteHeader />
        <main className="w-full flex-1 animate-page-in motion-reduce:animate-none">
          <VisitorLanding basics={basics} figures={await clubFigures()} />
        </main>
        <SiteFooter />
      </div>
    );
  }

  const extras = await homeMemberExtras(choice.viewer, locale as Locale, basics);
  if (!extras) return null;
  const props = { basics, viewer: choice.viewer, extras };
  const content = choice.variant === "feed" ? <MemberFeed {...props} /> : choice.variant === "matchday" ? <MemberMatchday {...props} /> : <MemberDashboard {...props} />;

  // The site's own frame (as the pages of the (site) group have).
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 animate-page-in px-4 py-10 motion-reduce:animate-none">{content}</main>
      <SiteFooter />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-24" aria-hidden>
      <div className="skeleton mx-auto h-16 w-2/3 rounded-[12px]" />
      <div className="skeleton h-48 rounded-[16px]" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="skeleton aspect-[3/2] rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}

export default function HomePage({ searchParams }: PageProps<"/[locale]">) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}
