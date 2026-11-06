import { LEGAL } from "@/lib/legal";
import { publicSiteUrl } from "@/lib/seo";
import { INSTAGRAM } from "@/lib/social";

/*
 * Structured data (schema.org) that tells search engines what the site is: the club, the site
 * itself, where a page sits. Rendered with <JsonLd> (components/json-ld.tsx).
 */

const CLUB_NAME = "PSG Zurich Supporters Club";
const logoUrl = () => `${publicSiteUrl()}/brand/logo-512.png`;
/** Values in [brackets] in lib/legal.ts are still placeholders: never published. */
const known = (value: string | null) => (value && !value.startsWith("[") ? value : undefined);

/** The club as publisher of an article. */
export function clubPublisher() {
  return { "@type": "Organization", name: CLUB_NAME, url: publicSiteUrl(), logo: logoUrl() };
}

/** For the home page: the club, and the site's name in search results. */
export function homeStructuredData(description: string) {
  const site = publicSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        url: `${site}/`,
        name: "PSG Zurich",
        alternateName: ["PSG Zürich", CLUB_NAME],
        publisher: { "@id": `${site}/#club` },
      },
      {
        "@type": "SportsOrganization",
        "@id": `${site}/#club`,
        name: CLUB_NAME,
        alternateName: ["PSG Zurich", "PSG Zürich"],
        description,
        url: `${site}/`,
        logo: logoUrl(),
        email: LEGAL.email,
        sport: "Football",
        sameAs: [INSTAGRAM.url],
        address: {
          "@type": "PostalAddress",
          streetAddress: known(LEGAL.street),
          postalCode: known(LEGAL.postcode),
          addressLocality: LEGAL.city,
          addressCountry: "CH",
        },
      },
    ],
  };
}

/** Where a page sits, for search results: [{ name, path }, …], from the home page down. */
export function breadcrumbs(items: { name: string; path: string }[]) {
  const site = publicSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: `${site}${item.path}` })),
  };
}
