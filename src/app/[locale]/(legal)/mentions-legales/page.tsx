import { LegalPage, legalMetadata } from "@/components/legal/legal-page";

export const generateMetadata = () => legalMetadata("imprint");

export default function ImprintPage() {
  return <LegalPage document="imprint" />;
}
