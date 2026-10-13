import type { Locale } from "next-intl";
import { STATUTES_INTRO, STATUTES_META, STATUTES_SECTIONS } from "@/content/statutes";
import { LEGAL, LEGAL_ADDRESS } from "@/lib/legal";

/** A paragraph, a bullet list, or label/value rows. Emails and https URLs become links. */
export type LegalBlock = { p: string } | { ul: string[] } | { dl: [label: string, value: string][] };
export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };
export type LegalDocument = {
  title: string;
  intro: string;
  sections: LegalSection[];
  /** Line under the intro; defaults to the update date. */
  meta?: string;
  /** Sections numbered "Art. 1", "Art. 2"… instead of 01, 02… */
  articles?: boolean;
  /** Language of the sections when they are not translated, plus the note that says so. */
  lang?: string;
  notice?: string;
};
export type LegalDocumentKey = "imprint" | "privacy" | "statutes";

const { association, email, host } = LEGAL;
const uid = LEGAL.uid;

const imprint: Record<Locale, LegalDocument> = {
  fr: {
    title: "Mentions légales",
    intro: `Informations sur l'éditeur du site psg-zurich.ch, conformément au droit suisse.`,
    sections: [
      {
        id: "editeur",
        title: "Éditeur",
        blocks: [
          {
            dl: [
              ["Association", association],
              ["Forme juridique", "Association au sens des art. 60 ss du Code civil suisse"],
              ["Siège", LEGAL.seat],
              ["Adresse", LEGAL_ADDRESS],
              ...(uid ? [["IDE", uid] as [string, string]] : []),
              ["Responsable de la publication", LEGAL.representative],
              ["Contact", email],
            ],
          },
        ],
      },
      {
        id: "hebergement",
        title: "Hébergement",
        blocks: [
          { dl: [["Hébergeur", host.name], ["Adresse", host.address], ["Site", host.url]] },
          { p: "Le site, sa base de données et ses e-mails sont hébergés en Suisse." },
        ],
      },
      {
        id: "propriete-intellectuelle",
        title: "Propriété intellectuelle",
        blocks: [
          {
            p: `Les textes, visuels et éléments graphiques propres au site appartiennent à ${association}. Toute reproduction sans autorisation écrite est interdite.`,
          },
          {
            p: "Le nom, l'écusson et les marques Paris Saint-Germain appartiennent au Paris Saint-Germain Football Club. Ils sont utilisés dans le cadre du statut de club de supporters officiel de l'association.",
          },
        ],
      },
      {
        id: "responsabilite",
        title: "Responsabilité",
        blocks: [
          {
            p: "Les informations publiées le sont avec soin, mais sans garantie d'exactitude ni d'exhaustivité. L'association ne répond pas des contenus des sites externes vers lesquels le site renvoie.",
          },
        ],
      },
      {
        id: "droit-applicable",
        title: "Droit applicable",
        blocks: [{ p: `Le droit suisse s'applique. Le for est à ${LEGAL.seat}.` }],
      },
    ],
  },
  en: {
    title: "Legal notice",
    intro: "Information about the publisher of psg-zurich.ch, in accordance with Swiss law.",
    sections: [
      {
        id: "editeur",
        title: "Publisher",
        blocks: [
          {
            dl: [
              ["Association", association],
              ["Legal form", "Association under Art. 60 et seq. of the Swiss Civil Code"],
              ["Registered office", LEGAL.seat],
              ["Address", LEGAL_ADDRESS],
              ...(uid ? [["UID", uid] as [string, string]] : []),
              ["Responsible for content", LEGAL.representative],
              ["Contact", email],
            ],
          },
        ],
      },
      {
        id: "hebergement",
        title: "Hosting",
        blocks: [
          { dl: [["Host", host.name], ["Address", host.address], ["Website", host.url]] },
          { p: "The website, its database and its emails are hosted in Switzerland." },
        ],
      },
      {
        id: "propriete-intellectuelle",
        title: "Intellectual property",
        blocks: [
          {
            p: `The texts, visuals and graphic elements specific to this website belong to ${association}. Any reproduction without written permission is prohibited.`,
          },
          {
            p: "The Paris Saint-Germain name, crest and trademarks belong to Paris Saint-Germain Football Club. They are used under the association's status as an official supporters club.",
          },
        ],
      },
      {
        id: "responsabilite",
        title: "Liability",
        blocks: [
          {
            p: "Information is published with care but without any guarantee of accuracy or completeness. The association is not responsible for the content of external websites linked from this site.",
          },
        ],
      },
      {
        id: "droit-applicable",
        title: "Governing law",
        blocks: [{ p: `Swiss law applies. The place of jurisdiction is ${LEGAL.seat}.` }],
      },
    ],
  },
  de: {
    title: "Impressum",
    intro: "Angaben zum Herausgeber von psg-zurich.ch nach Schweizer Recht.",
    sections: [
      {
        id: "editeur",
        title: "Herausgeber",
        blocks: [
          {
            dl: [
              ["Verein", association],
              ["Rechtsform", "Verein im Sinne von Art. 60 ff. ZGB"],
              ["Sitz", LEGAL.seat],
              ["Adresse", LEGAL_ADDRESS],
              ...(uid ? [["UID", uid] as [string, string]] : []),
              ["Verantwortlich für den Inhalt", LEGAL.representative],
              ["Kontakt", email],
            ],
          },
        ],
      },
      {
        id: "hebergement",
        title: "Hosting",
        blocks: [
          { dl: [["Hoster", host.name], ["Adresse", host.address], ["Website", host.url]] },
          { p: "Die Website, ihre Datenbank und ihre E-Mails werden in der Schweiz gehostet." },
        ],
      },
      {
        id: "propriete-intellectuelle",
        title: "Geistiges Eigentum",
        blocks: [
          {
            p: `Die Texte, Bilder und grafischen Elemente dieser Website gehören ${association}. Jede Vervielfältigung ohne schriftliche Genehmigung ist untersagt.`,
          },
          {
            p: "Name, Wappen und Marken von Paris Saint-Germain gehören dem Paris Saint-Germain Football Club. Sie werden im Rahmen des Status des Vereins als offizieller Supporters Club verwendet.",
          },
        ],
      },
      {
        id: "responsabilite",
        title: "Haftung",
        blocks: [
          {
            p: "Die Informationen werden sorgfältig veröffentlicht, jedoch ohne Gewähr für Richtigkeit oder Vollständigkeit. Für Inhalte verlinkter externer Websites übernimmt der Verein keine Verantwortung.",
          },
        ],
      },
      {
        id: "droit-applicable",
        title: "Anwendbares Recht",
        blocks: [{ p: `Es gilt Schweizer Recht. Gerichtsstand ist ${LEGAL.seat}.` }],
      },
    ],
  },
};

const privacy: Record<Locale, LegalDocument> = {
  fr: {
    title: "Confidentialité",
    intro:
      "Quelles données nous collectons, pourquoi, combien de temps nous les gardons et comment exercer vos droits, selon la loi fédérale sur la protection des données (LPD).",
    sections: [
      {
        id: "responsable",
        title: "Responsable du traitement",
        blocks: [
          {
            dl: [
              ["Association", association],
              ["Adresse", LEGAL_ADDRESS],
              ["Personne responsable", LEGAL.representative],
              ["Contact", email],
            ],
          },
        ],
      },
      {
        id: "donnees",
        title: "Données collectées",
        blocks: [
          {
            ul: [
              "Compte : prénom, nom, adresse e-mail et mot de passe (enregistré uniquement sous forme chiffrée, illisible même pour nous).",
              "Profil de membre : téléphone et adresse postale (facultatifs), statut de l'adhésion et date d'inscription.",
              "Consentement : date et heure auxquelles vous avez accepté les statuts et la présente politique.",
              "Sécurité : adresse IP et type de navigateur liés à vos sessions de connexion et à votre inscription.",
            ],
          },
          { p: "Nous ne collectons aucune donnée sensible et n'achetons aucune donnée à des tiers." },
        ],
      },
      {
        id: "finalites",
        title: "Utilisation",
        blocks: [
          {
            ul: [
              "Gérer votre adhésion et votre espace membre.",
              "Vous connecter de façon sécurisée et protéger les comptes contre les abus.",
              "Vous envoyer les e-mails nécessaires (confirmation d'adresse, mot de passe, adhésion, cotisation, événements auxquels vous êtes inscrit) et, si vous les gardez activés dans vos paramètres, les annonces d'événements, les rappels et résultats de pronostics et les actualités du club. Chacun de ces e-mails optionnels contient un lien pour s'en désabonner.",
            ],
          },
          { p: "Vos données ne sont jamais vendues, ni utilisées à des fins publicitaires." },
        ],
      },
      {
        id: "destinataires",
        title: "Hébergement et destinataires",
        blocks: [
          {
            p: `Les données sont stockées en Suisse chez ${host.name}, qui héberge le site, la base de données et la messagerie. Seuls les membres du comité chargés de l'administration y ont accès.`,
          },
          {
            p: "Exception : les cartes et la saisie d'adresse avec suggestions utilisent Google Maps (Google LLC, États-Unis). Quand vous affichez une carte ou tapez une adresse dans ces champs, Google reçoit votre adresse IP et le texte saisi. Le reste de vos données n'est jamais transmis.",
          },
        ],
      },
      {
        id: "conservation",
        title: "Durée de conservation",
        blocks: [
          {
            ul: [
              `Données de membre : pendant toute la durée de l'adhésion, puis ${LEGAL.retentionAfterMembership} au plus.`,
              "Sessions de connexion : 7 jours après la dernière activité.",
              "Historique des e-mails envoyés (destinataire, type, date) : 90 jours.",
              "Liens envoyés par e-mail : 24 heures pour la confirmation d'adresse, 1 heure pour le mot de passe.",
            ],
          },
        ],
      },
      {
        id: "cookies",
        title: "Cookies et stockage local",
        blocks: [
          {
            p: "Le site n'utilise qu'un seul cookie, indispensable : celui qui vous garde connecté. Votre navigateur retient aussi votre choix de thème (clair ou sombre) et les annonces que vous avez fermées.",
          },
          {
            p: "Aucun outil de mesure d'audience, aucune publicité. Les polices de caractères sont servies par le site lui-même. Seules les pages qui affichent une carte Google (Contact, événements) peuvent laisser Google déposer ses propres cookies.",
          },
        ],
      },
      {
        id: "securite",
        title: "Sécurité",
        blocks: [
          {
            p: "Les échanges sont chiffrés (HTTPS), les mots de passe sont stockés sous forme hachée et les liens envoyés par e-mail sont à usage limité dans le temps.",
          },
        ],
      },
      {
        id: "droits",
        title: "Vos droits",
        blocks: [
          {
            p: "Vous pouvez à tout moment demander à consulter, corriger, exporter ou supprimer vos données, ou retirer votre consentement.",
          },
          {
            p: `Écrivez-nous à ${email} : nous répondons dans un délai de 30 jours. Vous pouvez aussi vous adresser au Préposé fédéral à la protection des données et à la transparence (PFPDT) : https://www.edoeb.admin.ch`,
          },
        ],
      },
      {
        id: "modifications",
        title: "Modifications",
        blocks: [
          {
            p: "Cette politique peut évoluer. La date de mise à jour figure en haut de la page ; en cas de changement important, les membres sont prévenus par e-mail.",
          },
        ],
      },
    ],
  },
  en: {
    title: "Privacy",
    intro:
      "What data we collect, why, how long we keep it and how to exercise your rights, under the Swiss Federal Act on Data Protection (FADP).",
    sections: [
      {
        id: "responsable",
        title: "Data controller",
        blocks: [
          {
            dl: [
              ["Association", association],
              ["Address", LEGAL_ADDRESS],
              ["Responsible person", LEGAL.representative],
              ["Contact", email],
            ],
          },
        ],
      },
      {
        id: "donnees",
        title: "Data we collect",
        blocks: [
          {
            ul: [
              "Account: first name, last name, email address and password (stored only in encrypted form, unreadable even to us).",
              "Member profile: phone and postal address (optional), membership status and sign-up date.",
              "Consent: date and time at which you accepted the statutes and this policy.",
              "Security: IP address and browser type linked to your sign-in sessions and your sign-up.",
            ],
          },
          { p: "We collect no sensitive data and buy no data from third parties." },
        ],
      },
      {
        id: "finalites",
        title: "How we use it",
        blocks: [
          {
            ul: [
              "Manage your membership and your member area.",
              "Sign you in securely and protect accounts against abuse.",
              "Send you the necessary emails (address confirmation, password, membership, fee, events you signed up for) and, if you keep them on in your settings, event announcements, prediction reminders and results, and club news. Each of these optional emails has a link to unsubscribe.",
            ],
          },
          { p: "Your data is never sold or used for advertising." },
        ],
      },
      {
        id: "destinataires",
        title: "Hosting and recipients",
        blocks: [
          {
            p: `Data is stored in Switzerland by ${host.name}, which hosts the website, the database and the email service. Only committee members in charge of administration can access it.`,
          },
          {
            p: "Exception: maps and address fields with suggestions use Google Maps (Google LLC, United States). When you view a map or type an address in these fields, Google receives your IP address and what you type. None of your other data is ever transferred.",
          },
        ],
      },
      {
        id: "conservation",
        title: "Retention",
        blocks: [
          {
            ul: [
              `Member data: for the duration of the membership, then ${LEGAL.retentionAfterMembership} at most.`,
              "Sign-in sessions: 7 days after the last activity.",
              "History of the emails sent (recipient, type, date): 90 days.",
              "Links sent by email: 24 hours for address confirmation, 1 hour for passwords.",
            ],
          },
        ],
      },
      {
        id: "cookies",
        title: "Cookies and local storage",
        blocks: [
          {
            p: "The website uses a single, essential cookie: the one that keeps you signed in. Your browser also remembers your theme (light or dark) and the announcements you closed.",
          },
          {
            p: "No analytics, no advertising. Fonts are served by the website itself. Only the pages showing a Google map (Contact, events) may let Google set its own cookies.",
          },
        ],
      },
      {
        id: "securite",
        title: "Security",
        blocks: [
          {
            p: "Connections are encrypted (HTTPS), passwords are stored hashed and links sent by email expire quickly.",
          },
        ],
      },
      {
        id: "droits",
        title: "Your rights",
        blocks: [
          {
            p: "You can ask at any time to access, correct, export or delete your data, or withdraw your consent.",
          },
          {
            p: `Write to us at ${email}: we reply within 30 days. You can also contact the Federal Data Protection and Information Commissioner (FDPIC): https://www.edoeb.admin.ch`,
          },
        ],
      },
      {
        id: "modifications",
        title: "Changes",
        blocks: [
          {
            p: "This policy may change. The update date appears at the top of the page; members are notified by email of any significant change.",
          },
        ],
      },
    ],
  },
  de: {
    title: "Datenschutz",
    intro:
      "Welche Daten wir erheben, wozu, wie lange wir sie aufbewahren und wie du deine Rechte ausübst – nach dem Bundesgesetz über den Datenschutz (DSG).",
    sections: [
      {
        id: "responsable",
        title: "Verantwortliche Stelle",
        blocks: [
          {
            dl: [
              ["Verein", association],
              ["Adresse", LEGAL_ADDRESS],
              ["Verantwortliche Person", LEGAL.representative],
              ["Kontakt", email],
            ],
          },
        ],
      },
      {
        id: "donnees",
        title: "Erhobene Daten",
        blocks: [
          {
            ul: [
              "Konto: Vorname, Nachname, E-Mail-Adresse und Passwort (nur verschlüsselt gespeichert, auch für uns nicht lesbar).",
              "Mitgliederprofil: Telefon und Postadresse (freiwillig), Mitgliedschaftsstatus und Anmeldedatum.",
              "Einwilligung: Datum und Uhrzeit, zu denen du die Statuten und diese Erklärung akzeptiert hast.",
              "Sicherheit: IP-Adresse und Browsertyp deiner Anmeldesitzungen und deiner Registrierung.",
            ],
          },
          { p: "Wir erheben keine besonders schützenswerten Daten und kaufen keine Daten von Dritten." },
        ],
      },
      {
        id: "finalites",
        title: "Verwendung",
        blocks: [
          {
            ul: [
              "Deine Mitgliedschaft und deinen Mitgliederbereich verwalten.",
              "Dich sicher anmelden und Konten vor Missbrauch schützen.",
              "Dir die nötigen E-Mails senden (Adressbestätigung, Passwort, Mitgliedschaft, Beitrag, Veranstaltungen, für die du angemeldet bist) und, wenn du sie in deinen Einstellungen aktiviert lässt, Veranstaltungsankündigungen, Tipp-Erinnerungen und -Resultate sowie Clubneuigkeiten. Jede dieser freiwilligen E-Mails enthält einen Abmeldelink.",
            ],
          },
          { p: "Deine Daten werden nie verkauft oder für Werbung verwendet." },
        ],
      },
      {
        id: "destinataires",
        title: "Hosting und Empfänger",
        blocks: [
          {
            p: `Die Daten werden in der Schweiz bei ${host.name} gespeichert, die Website, Datenbank und E-Mail-Dienst hostet. Nur die für die Verwaltung zuständigen Vorstandsmitglieder haben Zugriff.`,
          },
          {
            p: "Ausnahme: Karten und Adressfelder mit Vorschlägen nutzen Google Maps (Google LLC, USA). Wenn du eine Karte ansiehst oder in diesen Feldern eine Adresse eingibst, erhält Google deine IP-Adresse und den eingegebenen Text. Deine übrigen Daten werden nie übermittelt.",
          },
        ],
      },
      {
        id: "conservation",
        title: "Aufbewahrung",
        blocks: [
          {
            ul: [
              `Mitgliederdaten: für die Dauer der Mitgliedschaft, danach höchstens ${LEGAL.retentionAfterMembership}.`,
              "Anmeldesitzungen: 7 Tage nach der letzten Aktivität.",
              "Verlauf der gesendeten E-Mails (Empfänger, Art, Datum): 90 Tage.",
              "Per E-Mail gesendete Links: 24 Stunden für die Adressbestätigung, 1 Stunde für das Passwort.",
            ],
          },
        ],
      },
      {
        id: "cookies",
        title: "Cookies und lokaler Speicher",
        blocks: [
          {
            p: "Die Website verwendet ein einziges, notwendiges Cookie: jenes, das dich angemeldet hält. Dein Browser merkt sich ausserdem dein Design (hell oder dunkel) und die geschlossenen Mitteilungen.",
          },
          {
            p: "Keine Reichweitenmessung, keine Werbung. Die Schriften werden von der Website selbst ausgeliefert. Nur die Seiten mit einer Google-Karte (Kontakt, Veranstaltungen) können Google eigene Cookies setzen lassen.",
          },
        ],
      },
      {
        id: "securite",
        title: "Sicherheit",
        blocks: [
          {
            p: "Verbindungen sind verschlüsselt (HTTPS), Passwörter werden gehasht gespeichert und per E-Mail gesendete Links sind nur kurz gültig.",
          },
        ],
      },
      {
        id: "droits",
        title: "Deine Rechte",
        blocks: [
          {
            p: "Du kannst jederzeit Auskunft, Berichtigung, Herausgabe oder Löschung deiner Daten verlangen oder deine Einwilligung widerrufen.",
          },
          {
            p: `Schreib uns an ${email}: Wir antworten innerhalb von 30 Tagen. Du kannst dich auch an den Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) wenden: https://www.edoeb.admin.ch`,
          },
        ],
      },
      {
        id: "modifications",
        title: "Änderungen",
        blocks: [
          {
            p: "Diese Erklärung kann sich ändern. Das Aktualisierungsdatum steht oben auf der Seite; bei wesentlichen Änderungen werden die Mitglieder per E-Mail informiert.",
          },
        ],
      },
    ],
  },
};

const statutesFr: LegalDocument = {
  title: "Statuts",
  intro: STATUTES_INTRO,
  meta: STATUTES_META,
  sections: STATUTES_SECTIONS,
  articles: true,
};

// Only the French text is adopted by the general assembly: shown as is, with a note.
const statutes: Record<Locale, LegalDocument> = {
  fr: statutesFr,
  en: {
    ...statutesFr,
    title: "Statutes",
    lang: "fr",
    notice: "The statutes are adopted in French: the French version below is the only authoritative one.",
  },
  de: {
    ...statutesFr,
    title: "Statuten",
    lang: "fr",
    notice: "Die Statuten werden auf Französisch verabschiedet: Massgebend ist allein die untenstehende französische Fassung.",
  },
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, Record<Locale, LegalDocument>> = { imprint, privacy, statutes };
