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
        id: "sources",
        title: "Sources et services tiers",
        blocks: [
          {
            ul: [
              "Calendriers, résultats et classements des matchs : football-data.org.",
              "Cartes, suggestions d'adresses et temps de trajet : Google Maps (Google LLC).",
              "Photos : association et, pour certaines illustrations, banques d'images libres de droits (Pexels).",
            ],
          },
          { p: "Ces données sont affichées à titre informatif ; seules les annonces du club engagent l'association." },
        ],
      },
      {
        id: "donnees-personnelles",
        title: "Données personnelles",
        blocks: [
          {
            p: `Le traitement des données des membres et des visiteurs est décrit dans la page Confidentialité. Pour toute question : ${email}.`,
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
        id: "sources",
        title: "Sources and third-party services",
        blocks: [
          {
            ul: [
              "Match fixtures, results and standings: football-data.org.",
              "Maps, address suggestions and travel times: Google Maps (Google LLC).",
              "Photos: the association and, for some illustrations, royalty-free image libraries (Pexels).",
            ],
          },
          { p: "This data is shown for information only; only the club's own announcements bind the association." },
        ],
      },
      {
        id: "donnees-personnelles",
        title: "Personal data",
        blocks: [
          {
            p: `How members' and visitors' data is handled is described on the Privacy page. Any questions: ${email}.`,
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
        id: "sources",
        title: "Quellen und Drittdienste",
        blocks: [
          {
            ul: [
              "Spielpläne, Resultate und Tabellen: football-data.org.",
              "Karten, Adressvorschläge und Fahrzeiten: Google Maps (Google LLC).",
              "Fotos: der Verein und, für einzelne Illustrationen, lizenzfreie Bilddatenbanken (Pexels).",
            ],
          },
          { p: "Diese Angaben dienen nur zur Information; verbindlich sind allein die Mitteilungen des Clubs." },
        ],
      },
      {
        id: "donnees-personnelles",
        title: "Personendaten",
        blocks: [
          {
            p: `Wie wir die Daten von Mitgliedern und Besuchenden bearbeiten, steht auf der Seite Datenschutz. Bei Fragen: ${email}.`,
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
      "Quelles données nous collectons, pourquoi, qui y a accès, combien de temps nous les gardons et comment exercer vos droits, selon la loi fédérale sur la protection des données (LPD).",
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
              "Compte : prénom, nom, adresse e-mail, mot de passe (enregistré uniquement sous forme chiffrée, illisible même pour nous) et photo de profil si vous en ajoutez une.",
              "Profil de membre : téléphone et adresse postale (facultatifs), langue, numéro de membre, statut de l'adhésion, dates de demande et d'adhésion, et date jusqu'à laquelle la cotisation est payée.",
              "Questions d'accueil (toutes facultatives) : date de naissance, centres d'intérêt, accès à la billetterie du PSG et choix concernant les photos, avec la date de ce choix.",
              "Vie du club : vos inscriptions aux événements (y compris la liste d'attente), votre présence le jour même quand votre carte de membre est scannée à l'entrée (date et heure), vos pronostics et le pseudo éventuel du classement, et vos réponses aux sondages du club.",
              "Carte de membre : un code aléatoire, imprimé dans le QR code, qui permet au comité de vérifier votre adhésion à l'entrée. Il ne contient aucune donnée personnelle et peut être renouvelé.",
              "Newsletter : adresse e-mail et langue, si vous vous y abonnez sans être membre.",
              "Messages de contact : nom, adresse e-mail, sujet, organisation éventuelle, le texte de vos messages et les réponses du comité. Pour un problème sur le site, la page concernée et le type de navigateur.",
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
              "Gérer votre adhésion, votre cotisation et votre espace membre.",
              "Appliquer les statuts : la date de naissance distingue membres actifs et juniors (cotisation réduite, accord d'un représentant légal). Elle n'est jamais visible par les autres membres.",
              "Organiser la vie du club : proposer les événements qui vous intéressent, gérer les places et la liste d'attente, contrôler les entrées et coordonner les achats de billets groupés lors des déplacements.",
              "Pronostics : votre prénom et l'initiale de votre nom (ou votre pseudo), avec votre photo de profil, apparaissent dans le classement des membres. Vous pouvez vous en masquer dans vos paramètres. Au 30 juin, le classement de la saison est figé et conservé tant que votre compte existe ; les trois premiers reçoivent un trophée affiché à côté de leur nom et une récompense remise par le comité.",
              "Sondages : seul le total des voix par réponse est affiché, aux membres comme au comité. Votre choix personnel n'est visible que par vous.",
              "Documents du club (statuts, procès-verbaux…) : ils sont mis à disposition des membres et ne contiennent pas de données vous concernant, sauf mention contraire.",
              "Photos : le club ne publie des photos où vous êtes reconnaissable (site, réseaux) que si vous l'avez accepté. Vous pouvez retirer votre accord à tout moment dans vos paramètres.",
              "Vous connecter de façon sécurisée et protéger les comptes contre les abus.",
              "Vous envoyer les e-mails nécessaires (confirmation d'adresse, mot de passe, adhésion, cotisation, événements auxquels vous êtes inscrit) et, si vous les gardez activés dans vos paramètres, les annonces d'événements, les rappels et résultats de pronostics et les actualités du club. Chacun de ces e-mails optionnels contient un lien pour s'en désabonner.",
            ],
          },
          { p: "Vos données ne sont jamais vendues, ni utilisées à des fins publicitaires." },
        ],
      },
      {
        id: "acces",
        title: "Qui y a accès au sein du club",
        blocks: [
          {
            ul: [
              "Administrateurs (membres du comité) : l'ensemble des données de membre, pour gérer les adhésions, les cotisations, les e-mails et les exports nécessaires à l'organisation (liste des inscrits d'un déplacement, par exemple).",
              "Modérateurs (bénévoles désignés par le comité) : l'annuaire des membres en lecture seule (coordonnées, profil, cotisation) et les données des événements (inscriptions, présence), pour l'organisation et l'accueil. Ils ne peuvent ni modifier les adhésions ni exporter la liste des membres.",
              "Messages de contact : les administrateurs lisent tous les sujets, les modérateurs uniquement « Événements et déplacements » et « Problème sur le site ». Une copie de chaque message arrive dans la boîte e-mail du club. Les notes internes du comité ne sont visibles que par lui.",
              "Les autres membres voient seulement votre nom et votre photo dans la liste « Avec qui ? » des événements auxquels vous êtes inscrit, et votre place au classement des pronostics (sauf si vous vous en masquez).",
            ],
          },
          {
            p: "Chaque action du comité sur les données (acceptation, cotisation, modification, export…) est enregistrée dans un journal d'audit, avec son auteur, sa date et l'adresse IP utilisée.",
          },
        ],
      },
      {
        id: "destinataires",
        title: "Hébergement et destinataires",
        blocks: [
          {
            p: `Les données sont stockées en Suisse chez ${host.name}, qui héberge le site, la base de données, les documents et la messagerie. Elles ne sont transmises à aucun autre destinataire.`,
          },
          {
            p: "Exception : les cartes et la saisie d'adresse avec suggestions utilisent Google Maps (Google LLC, États-Unis). Quand vous affichez une carte ou tapez une adresse dans ces champs, Google reçoit votre adresse IP et le texte saisi. Pour afficher le temps de trajet en voiture jusqu'à un événement, le serveur du club envoie à Google votre adresse (rue, NPA, localité) et le lieu de l'événement, sans votre nom ni votre e-mail ; seul le résultat est conservé, sous une clé qui ne permet pas de retrouver l'adresse. Le reste de vos données n'est jamais transmis.",
          },
          {
            p: "Les résultats et calendriers des matchs proviennent de football-data.org : aucune donnée vous concernant ne lui est envoyée.",
          },
        ],
      },
      {
        id: "conservation",
        title: "Durée de conservation",
        blocks: [
          {
            ul: [
              `Données de membre, inscriptions, présences, pronostics et votes : pendant toute la durée de l'adhésion, puis ${LEGAL.retentionAfterMembership} au plus.`,
              "Demandes d'adhésion refusées : conservées jusqu'à l'assemblée générale suivante (droit de recours), puis supprimées sur demande.",
              "Journal d'audit des actions du comité : 2 ans.",
              "Messages de contact : 2 ans après la fin de l'échange (30 jours pour les messages classés comme spam), et supprimés avec votre compte. Si vous écrivez sans compte, un lien personnel, envoyé par e-mail, vous permet de suivre l'échange.",
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
            p: "Le site n'utilise qu'un seul cookie, indispensable : celui qui vous garde connecté. Votre navigateur retient aussi votre choix de thème (clair ou sombre), les annonces que vous avez fermées, le brouillon d'un message de contact en cours d'écriture et, pour le comité, l'affichage du menu d'administration.",
          },
          {
            p: "Aucun outil de mesure d'audience, aucune publicité. Les polices de caractères sont servies par le site lui-même. Seules les pages qui affichent une carte Google (Contact, événements) peuvent laisser Google déposer ses propres cookies. Le scanner de cartes du comité utilise la caméra du téléphone uniquement pendant le scan : aucune image n'est enregistrée ni envoyée.",
          },
        ],
      },
      {
        id: "securite",
        title: "Sécurité",
        blocks: [
          {
            p: "Les échanges sont chiffrés (HTTPS), les mots de passe sont stockés sous forme hachée, les liens envoyés par e-mail sont à usage limité dans le temps, et l'accès aux données du comité est limité selon le rôle de chacun.",
          },
        ],
      },
      {
        id: "droits",
        title: "Vos droits",
        blocks: [
          {
            p: "Vous pouvez à tout moment consulter, corriger, exporter ou supprimer vos données, ou retirer votre consentement. Depuis vos paramètres, vous pouvez déjà modifier votre profil, télécharger toutes vos données (fichier JSON) et supprimer votre compte.",
          },
          {
            p: `Pour toute autre demande, écrivez-nous à ${email} : nous répondons dans un délai de 30 jours. Vous pouvez aussi vous adresser au Préposé fédéral à la protection des données et à la transparence (PFPDT) : https://www.edoeb.admin.ch`,
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
      "What data we collect, why, who can access it, how long we keep it and how to exercise your rights, under the Swiss Federal Act on Data Protection (FADP).",
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
              "Account: first name, last name, email address, password (stored only in encrypted form, unreadable even to us) and a profile picture if you add one.",
              "Member profile: phone and postal address (optional), language, member number, membership status, request and membership dates, and the date until which your fee is paid.",
              "Welcome questions (all optional): date of birth, interests, access to PSG ticketing and your choice about photos, with the date of that choice.",
              "Club life: your event sign-ups (waiting list included), your attendance on the day when your member card is scanned at the door (date and time), your predictions and any leaderboard nickname, and your answers to the club's polls.",
              "Member card: a random code, printed in the QR code, that lets the committee check your membership at the door. It holds no personal data and can be renewed.",
              "Newsletter: email address and language, if you subscribe without being a member.",
              "Contact messages: name, email address, topic, any organisation, the text of your messages and the committee's replies. For a problem with the site, the page concerned and the type of browser.",
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
              "Manage your membership, your fee and your member area.",
              "Apply the statutes: the date of birth distinguishes active and junior members (reduced fee, consent of a legal guardian). It is never visible to other members.",
              "Run club life: suggest the events you care about, manage places and the waiting list, check people in at the door and coordinate group ticket purchases for away trips.",
              "Predictions: your first name and last-name initial (or your nickname), with your profile picture, appear in the members' leaderboard. You can hide yourself in your settings. On 30 June the season's table is frozen and kept for as long as your account exists; the top three get a trophy shown next to their name and a prize handed over by the committee.",
              "Polls: only the total number of votes per answer is shown, to members and committee alike. Your own choice is visible to you only.",
              "Club documents (statutes, minutes…): they are shared with members and hold no data about you unless stated otherwise.",
              "Photos: the club only publishes photos in which you can be recognised (website, social media) if you have agreed to it. You can withdraw your consent at any time in your settings.",
              "Sign you in securely and protect accounts against abuse.",
              "Send you the necessary emails (address confirmation, password, membership, fee, events you signed up for) and, if you keep them enabled in your settings, event announcements, prediction reminders and results, and club news. Each of these optional emails contains an unsubscribe link.",
            ],
          },
          { p: "Your data is never sold or used for advertising." },
        ],
      },
      {
        id: "acces",
        title: "Who can access it within the club",
        blocks: [
          {
            ul: [
              "Administrators (committee members): all member data, to manage memberships, fees, emails and the exports the organisation needs (the sign-up list of an away trip, for instance).",
              "Moderators (volunteers appointed by the committee): the member list, read only (contact details, profile, fee), and event data (sign-ups, attendance), for organising and welcoming people. They can neither change memberships nor export the member list.",
              "Contact messages: admins read every topic, moderators only “Events and away trips” and “Problem with the site”. A copy of each message reaches the club's mailbox. The committee's internal notes are visible to the committee only.",
              "Other members only see your name and picture in the “Who's going?” list of the events you signed up for, and your place in the predictions leaderboard (unless you hide yourself).",
            ],
          },
          {
            p: "Every committee action on the data (acceptance, fee, change, export…) is recorded in an audit log, with its author, its date and the IP address used.",
          },
        ],
      },
      {
        id: "destinataires",
        title: "Hosting and recipients",
        blocks: [
          {
            p: `Data is stored in Switzerland with ${host.name}, which hosts the website, the database, the documents and the email service. It is not passed on to any other recipient.`,
          },
          {
            p: "Exception: maps and the address field with suggestions use Google Maps (Google LLC, USA). When you display a map or type an address in these fields, Google receives your IP address and the text you type. To show the driving time to an event, the club's server sends Google your address (street, postcode, town) and the event's location, without your name or email; only the result is kept, under a key from which the address cannot be recovered. None of your other data is ever transmitted.",
          },
          {
            p: "Match results and fixtures come from football-data.org: no data about you is sent to it.",
          },
        ],
      },
      {
        id: "conservation",
        title: "Retention",
        blocks: [
          {
            ul: [
              `Member data, sign-ups, attendance, predictions and votes: for the duration of the membership, then ${LEGAL.retentionAfterMembership} at most.`,
              "Refused membership requests: kept until the next general assembly (right of appeal), then deleted on request.",
              "Audit log of committee actions: 2 years.",
              "Contact messages: 2 years after the conversation ends (30 days for messages marked as spam), and deleted with your account. If you write without an account, a personal link sent by email lets you follow the conversation.",
              "Sign-in sessions: 7 days after the last activity.",
              "History of sent emails (recipient, type, date): 90 days.",
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
            p: "The website uses a single, essential cookie: the one that keeps you signed in. Your browser also remembers your theme (light or dark), the announcements you closed, the draft of a contact message you are writing and, for the committee, how the admin menu is displayed.",
          },
          {
            p: "No analytics, no advertising. Fonts are served by the website itself. Only pages that display a Google map (Contact, events) may let Google set its own cookies. The committee's card scanner uses the phone's camera only while scanning: no image is recorded or sent.",
          },
        ],
      },
      {
        id: "securite",
        title: "Security",
        blocks: [
          {
            p: "Traffic is encrypted (HTTPS), passwords are stored hashed, links sent by email expire, and the committee's access to data is limited according to each person's role.",
          },
        ],
      },
      {
        id: "droits",
        title: "Your rights",
        blocks: [
          {
            p: "You can at any time view, correct, export or delete your data, or withdraw your consent. In your settings you can already edit your profile, download all your data (JSON file) and delete your account.",
          },
          {
            p: `For any other request, write to us at ${email}: we reply within 30 days. You can also contact the Federal Data Protection and Information Commissioner (FDPIC): https://www.edoeb.admin.ch`,
          },
        ],
      },
      {
        id: "modifications",
        title: "Changes",
        blocks: [
          {
            p: "This policy may change. The update date is shown at the top of the page; members are notified by email of any significant change.",
          },
        ],
      },
    ],
  },
  de: {
    title: "Datenschutz",
    intro:
      "Welche Daten wir erheben, wozu, wer darauf zugreift, wie lange wir sie aufbewahren und wie du deine Rechte ausübst – nach dem Bundesgesetz über den Datenschutz (DSG).",
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
              "Konto: Vorname, Nachname, E-Mail-Adresse, Passwort (nur verschlüsselt gespeichert, auch für uns nicht lesbar) und ein Profilbild, falls du eines hinzufügst.",
              "Mitgliederprofil: Telefon und Postadresse (freiwillig), Sprache, Mitgliedsnummer, Mitgliedschaftsstatus, Antrags- und Beitrittsdatum sowie das Datum, bis zu dem dein Beitrag bezahlt ist.",
              "Willkommensfragen (alle freiwillig): Geburtsdatum, Interessen, Zugang zum PSG-Ticketing und deine Entscheidung zu Fotos, mit dem Datum dieser Entscheidung.",
              "Vereinsleben: deine Anmeldungen zu Veranstaltungen (inkl. Warteliste), deine Anwesenheit am Tag selbst, wenn deine Mitgliederkarte am Eingang gescannt wird (Datum und Uhrzeit), deine Tipps und ein allfälliger Spitzname in der Rangliste sowie deine Antworten auf die Umfragen des Clubs.",
              "Mitgliederkarte: ein zufälliger Code im QR-Code, mit dem der Vorstand deine Mitgliedschaft am Eingang prüft. Er enthält keine Personendaten und kann erneuert werden.",
              "Newsletter: E-Mail-Adresse und Sprache, wenn du dich ohne Mitgliedschaft anmeldest.",
              "Kontaktnachrichten: Name, E-Mail-Adresse, Thema, allfällige Organisation, der Text deiner Nachrichten und die Antworten des Vorstands. Bei einem Problem mit der Website die betroffene Seite und der Browsertyp.",
              "Einwilligung: Datum und Uhrzeit, zu denen du die Statuten und diese Erklärung akzeptiert hast.",
              "Sicherheit: IP-Adresse und Browsertyp im Zusammenhang mit deinen Anmeldesitzungen und deiner Registrierung.",
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
              "Deine Mitgliedschaft, deinen Beitrag und deinen Mitgliederbereich verwalten.",
              "Die Statuten anwenden: Das Geburtsdatum unterscheidet aktive Mitglieder und Junioren (reduzierter Beitrag, Zustimmung einer gesetzlichen Vertretung). Es ist für andere Mitglieder nie sichtbar.",
              "Das Vereinsleben organisieren: passende Veranstaltungen vorschlagen, Plätze und Warteliste verwalten, den Einlass kontrollieren und Gruppen-Ticketkäufe für Auswärtsfahrten koordinieren.",
              "Tipps: Dein Vorname und die Initiale deines Nachnamens (oder dein Spitzname) erscheinen mit deinem Profilbild in der Rangliste der Mitglieder. In deinen Einstellungen kannst du dich ausblenden. Am 30. Juni wird die Saisonrangliste eingefroren und aufbewahrt, solange dein Konto besteht; die ersten drei erhalten eine Trophäe neben ihrem Namen und einen Preis, den der Vorstand übergibt.",
              "Umfragen: Angezeigt wird nur die Gesamtzahl der Stimmen pro Antwort, für Mitglieder wie für den Vorstand. Deine eigene Wahl siehst nur du.",
              "Dokumente des Clubs (Statuten, Protokolle …): Sie werden den Mitgliedern zur Verfügung gestellt und enthalten keine Daten über dich, sofern nicht anders angegeben.",
              "Fotos: Der Club veröffentlicht Fotos, auf denen du erkennbar bist (Website, soziale Netzwerke), nur mit deiner Zustimmung. Du kannst sie jederzeit in deinen Einstellungen widerrufen.",
              "Dich sicher anmelden und Konten vor Missbrauch schützen.",
              "Dir die nötigen E-Mails senden (Adressbestätigung, Passwort, Mitgliedschaft, Beitrag, Veranstaltungen, für die du angemeldet bist) und – sofern du sie in deinen Einstellungen aktiviert lässt – Veranstaltungshinweise, Tipp-Erinnerungen und -Resultate sowie Club-News. Jede dieser optionalen E-Mails enthält einen Abmeldelink.",
            ],
          },
          { p: "Deine Daten werden nie verkauft und nicht für Werbung verwendet." },
        ],
      },
      {
        id: "acces",
        title: "Wer im Club darauf zugreift",
        blocks: [
          {
            ul: [
              "Administratoren (Vorstandsmitglieder): alle Mitgliederdaten, um Mitgliedschaften, Beiträge, E-Mails und die für die Organisation nötigen Exporte zu verwalten (z. B. die Anmeldeliste einer Auswärtsfahrt).",
              "Moderatoren (vom Vorstand bestimmte Freiwillige): die Mitgliederliste nur zum Lesen (Kontaktdaten, Profil, Beitrag) und die Daten der Veranstaltungen (Anmeldungen, Anwesenheit), für Organisation und Einlass. Sie können weder Mitgliedschaften ändern noch die Mitgliederliste exportieren.",
              "Kontaktnachrichten: Admins lesen alle Themen, Moderatoren nur «Events und Auswärtsfahrten» und «Problem mit der Website». Eine Kopie jeder Nachricht geht an das E-Mail-Postfach des Clubs. Interne Notizen des Vorstands sieht nur der Vorstand.",
              "Andere Mitglieder sehen nur deinen Namen und dein Bild in der Liste «Mit wem?» der Veranstaltungen, für die du angemeldet bist, und deinen Platz in der Tipp-Rangliste (ausser du blendest dich aus).",
            ],
          },
          {
            p: "Jede Aktion des Vorstands an den Daten (Annahme, Beitrag, Änderung, Export …) wird in einem Audit-Protokoll mit Urheber, Datum und verwendeter IP-Adresse festgehalten.",
          },
        ],
      },
      {
        id: "destinataires",
        title: "Hosting und Empfänger",
        blocks: [
          {
            p: `Die Daten werden in der Schweiz bei ${host.name} gespeichert, das die Website, die Datenbank, die Dokumente und den E-Mail-Dienst hostet. Sie werden an keine weiteren Empfänger weitergegeben.`,
          },
          {
            p: "Ausnahme: Karten und das Adressfeld mit Vorschlägen nutzen Google Maps (Google LLC, USA). Wenn du eine Karte anzeigst oder in diesen Feldern eine Adresse eingibst, erhält Google deine IP-Adresse und den eingegebenen Text. Um die Fahrzeit mit dem Auto zu einer Veranstaltung anzuzeigen, sendet der Server des Clubs Google deine Adresse (Strasse, PLZ, Ort) und den Ort der Veranstaltung, ohne Namen oder E-Mail; gespeichert wird nur das Ergebnis, unter einem Schlüssel, aus dem sich die Adresse nicht ableiten lässt. Deine übrigen Daten werden nie übermittelt.",
          },
          {
            p: "Spielresultate und Spielpläne stammen von football-data.org: Es werden keine Daten über dich dorthin gesendet.",
          },
        ],
      },
      {
        id: "conservation",
        title: "Aufbewahrung",
        blocks: [
          {
            ul: [
              `Mitgliederdaten, Anmeldungen, Anwesenheiten, Tipps und Stimmen: für die Dauer der Mitgliedschaft, danach höchstens ${LEGAL.retentionAfterMembership}.`,
              "Abgelehnte Mitgliedsanträge: bis zur nächsten Generalversammlung (Rekursrecht), danach auf Anfrage gelöscht.",
              "Audit-Protokoll der Vorstandsaktionen: 2 Jahre.",
              "Kontaktnachrichten: 2 Jahre nach Abschluss des Austauschs (30 Tage für als Spam markierte Nachrichten), und mit deinem Konto gelöscht. Schreibst du ohne Konto, kannst du den Austausch über einen persönlichen Link aus der E-Mail verfolgen.",
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
            p: "Die Website verwendet nur ein einziges, notwendiges Cookie: jenes, das dich angemeldet hält. Dein Browser speichert ausserdem dein Farbschema (hell oder dunkel), die geschlossenen Hinweise, den Entwurf einer Kontaktnachricht und, für den Vorstand, die Darstellung des Admin-Menüs.",
          },
          {
            p: "Keine Analyse-Tools, keine Werbung. Die Schriften werden von der Website selbst ausgeliefert. Nur Seiten mit einer Google-Karte (Kontakt, Veranstaltungen) können Google eigene Cookies setzen lassen. Der Kartenscanner des Vorstands nutzt die Handykamera nur während des Scans: Es wird kein Bild gespeichert oder gesendet.",
          },
        ],
      },
      {
        id: "securite",
        title: "Sicherheit",
        blocks: [
          {
            p: "Die Verbindungen sind verschlüsselt (HTTPS), Passwörter werden gehasht gespeichert, per E-Mail gesendete Links sind zeitlich begrenzt, und der Zugriff des Vorstands auf die Daten ist je nach Rolle beschränkt.",
          },
        ],
      },
      {
        id: "droits",
        title: "Deine Rechte",
        blocks: [
          {
            p: "Du kannst deine Daten jederzeit einsehen, berichtigen, exportieren oder löschen sowie deine Einwilligung widerrufen. In deinen Einstellungen kannst du bereits dein Profil ändern, alle deine Daten herunterladen (JSON-Datei) und dein Konto löschen.",
          },
          {
            p: `Für andere Anliegen schreib uns an ${email}: Wir antworten innert 30 Tagen. Du kannst dich auch an den Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) wenden: https://www.edoeb.admin.ch`,
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
