import { ComingSoonPage, comingSoonMetadata } from "@/components/coming-soon-page";

export const generateMetadata = () => comingSoonMetadata("news");

export default function NewsPage() {
  return <ComingSoonPage section="news" />;
}
