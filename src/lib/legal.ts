/**
 * Facts shown on the legal pages (/mentions-legales, /confidentialite).
 * Values in [brackets] are placeholders: replace them before opening sign-ups.
 */
export const LEGAL = {
  association: "PSG Zurich Supporters Club",
  seat: "Zurich",
  street: "[Rue et numéro]",
  postcode: "[NPA]",
  city: "Zurich",
  country: "Suisse",
  /** Business identification number (UID), if the association is registered; otherwise null. */
  uid: "[CHE-000.000.000]" as string | null,
  /** Person responsible for the content and the data processing (usually the president). */
  representative: "[Prénom Nom]",
  email: "contact@psg-zurich.ch",
  /** How long member data is kept after membership ends. */
  retentionAfterMembership: "[2 ans]",
  /** Date of the current version of both documents (YYYY-MM-DD). */
  updatedAt: "2026-10-17",
  /** Statutes (/statuts). */
  statutes: {
    foundedAt: "[JJ mois AAAA]",
    adoptedAt: "[JJ mois AAAA]",
    adoptedIn: "[Lieu]",
    president: "[Prénom Nom]",
    secretary: "[Prénom Nom]",
    /** Annual fee, as set by the general assembly. */
    fee: "[CHF 50.–]",
    juniorFee: "[CHF 25.–]",
    committeeMin: "[5]",
    committeeMax: "[9]",
    /** Month by which the ordinary general assembly is held. */
    assemblyBy: "[fin septembre]",
    fiscalYearEnd: "[30 juin]",
  },
  /** How to pay the fee (/cotisation); the committee then records it in the admin. */
  payment: {
    accountHolder: "[PSG Zurich Supporters Club]",
    iban: "[CH00 0000 0000 0000 0000 0]",
    bank: "[Nom de la banque]",
    /** TWINT number, or null if not offered. */
    twint: "[+41 79 000 00 00]" as string | null,
  },
  host: {
    name: "Infomaniak Network SA",
    address: "Rue Eugène-Marziano 25, 1227 Les Acacias (GE), Suisse",
    url: "https://www.infomaniak.com",
  },
} as const;

export const LEGAL_ADDRESS = `${LEGAL.street}, ${LEGAL.postcode} ${LEGAL.city}, ${LEGAL.country}`;
