import { ComingSoonPage, comingSoonMetadata } from "@/components/coming-soon-page";

export const generateMetadata = () => comingSoonMetadata("membership");

export default function MembershipPage() {
  return <ComingSoonPage section="membership" />;
}
