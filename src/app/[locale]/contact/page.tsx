import { ComingSoonPage, comingSoonMetadata } from "@/components/coming-soon-page";

export const generateMetadata = () => comingSoonMetadata("contact");

export default function ContactPage() {
  return <ComingSoonPage section="contact" />;
}
