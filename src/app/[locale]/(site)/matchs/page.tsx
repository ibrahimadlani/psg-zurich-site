import { ComingSoonPage, comingSoonMetadata } from "@/components/coming-soon-page";

export const generateMetadata = () => comingSoonMetadata("matches");

export default function MatchesPage() {
  return <ComingSoonPage section="matches" />;
}
