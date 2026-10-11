import { ComingSoonPage, comingSoonMetadata } from "@/components/coming-soon-page";

export const generateMetadata = () => comingSoonMetadata("events");

export default function EventsPage() {
  return <ComingSoonPage section="events" />;
}
