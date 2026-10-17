/*
 * The site's pages had French addresses (/fr/actualites, /fr/espace-membre…) before they all
 * moved to English ones (/fr/news, /fr/member…). Links already out there (emails, QR codes,
 * bookmarks, search results) are sent on to the new address.
 */

const LEGACY: Record<string, string> = {
  "actualites": "news",
  "adhesion": "join",
  "automatisations": "automations",
  "banniere": "banner",
  "bienvenue": "welcome",
  "boutique": "shop",
  "campagnes": "campaigns",
  "classement": "leaderboard",
  "commande": "checkout",
  "commandes": "orders",
  "compte": "account",
  "confidentialite": "privacy",
  "connexion": "login",
  "cotisation": "dues",
  "cotisations": "dues",
  "desabonnement": "unsubscribe",
  "espace-membre": "member",
  "evenements": "events",
  "journal": "audit",
  "matchs": "matches",
  "membres": "members",
  "mentions-legales": "legal-notice",
  "mot-de-passe-oublie": "forgot-password",
  "nouveau": "new",
  "nouveau-mot-de-passe": "reset-password",
  "paiement": "payment",
  "paiements": "payments",
  "parametres": "settings",
  "profil": "profile",
  "reglages": "settings",
  "sondages": "polls",
  "soutenir": "donate",
  "statuts": "statutes",
  "suivi": "track",
  "versements": "payouts",
};

/** The English address of an old French one, or null when nothing changes. */
export function englishPath(pathname: string) {
  const segments = pathname.split("/");
  let changed = false;
  const mapped = segments.map((segment) => {
    const english = LEGACY[segment];
    if (!english) return segment;
    changed = true;
    return english;
  });
  return changed ? mapped.join("/") : null;
}
