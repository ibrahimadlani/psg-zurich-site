import { LegalPage, legalMetadata } from "@/components/legal/legal-page";

export const generateMetadata = () => legalMetadata("statutes");

export default function StatutesPage() {
  return <LegalPage document="statutes" />;
}
