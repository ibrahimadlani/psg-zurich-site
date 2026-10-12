import type { LegalSection } from "@/content/legal";
import { LEGAL, LEGAL_ADDRESS } from "@/lib/legal";

const { association, email } = LEGAL;
const s = LEGAL.statutes;

/** Statutes of the association. French only: it is the version adopted by the general assembly. */
export const STATUTES_INTRO = `Statuts de l'association ${association}, constituée à ${LEGAL.seat} le ${s.foundedAt}.`;
export const STATUTES_META = `Adoptés par l'assemblée générale du ${s.adoptedAt} à ${s.adoptedIn}.`;

export const STATUTES_SECTIONS: LegalSection[] = [
  // I. Dispositions générales
  {
    id: "nom-siege",
    title: "Nom et siège",
    blocks: [
      {
        p: `Sous le nom « ${association} », il est constitué une association à but non lucratif, régie par les présents statuts et par les articles 60 et suivants du Code civil suisse.`,
      },
      { p: `Son siège est à ${LEGAL.seat}. Sa durée est illimitée.` },
    ],
  },
  {
    id: "buts",
    title: "Buts",
    blocks: [
      { p: "L'association a pour buts :" },
      {
        ul: [
          "réunir les supporters du Paris Saint-Germain résidant à Zurich et en Suisse alémanique ;",
          "organiser la diffusion collective des matchs, des déplacements et des rencontres entre membres ;",
          "faciliter l'accès de ses membres à la billetterie, dans le respect des règles du club et des organisateurs ;",
          "promouvoir un supportérisme festif, respectueux et responsable ;",
          "entretenir des liens avec le Paris Saint-Germain et avec les autres clubs de supporters officiels.",
        ],
      },
      { p: "L'association ne poursuit aucun but lucratif. Ses éventuels bénéfices sont entièrement affectés à ses buts." },
    ],
  },
  {
    id: "valeurs",
    title: "Neutralité et valeurs",
    blocks: [
      { p: "L'association est neutre sur les plans politique et confessionnel." },
      {
        p: "Elle condamne toute forme de violence, de racisme, d'homophobie, de sexisme et de discrimination, dans les stades comme en dehors. Chaque membre s'engage à respecter la charte du supporter du Paris Saint-Germain et les règlements des stades et des organisateurs.",
      },
    ],
  },
  {
    id: "ressources",
    title: "Ressources",
    blocks: [
      { p: "Les ressources de l'association proviennent :" },
      {
        ul: [
          "des cotisations des membres ;",
          "des recettes de ses activités et manifestations ;",
          "des dons, legs et parrainages ;",
          "de toute autre ressource autorisée par la loi.",
        ],
      },
    ],
  },
  // II. Membres
  {
    id: "membres",
    title: "Membres",
    blocks: [
      { p: "L'association se compose de :" },
      {
        ul: [
          "membres actifs : personnes physiques âgées de 18 ans révolus, à jour de leur cotisation ; ils disposent du droit de vote ;",
          "membres juniors : personnes âgées de moins de 18 ans, avec l'accord de leur représentant légal ; ils participent à l'assemblée générale avec voix consultative ;",
          "membres d'honneur : personnes nommées par l'assemblée générale pour services rendus à l'association ; ils sont dispensés de cotisation et disposent du droit de vote.",
        ],
      },
    ],
  },
  {
    id: "admission",
    title: "Admission",
    blocks: [
      {
        p: "Toute personne qui partage les buts de l'association peut demander son admission en remplissant le formulaire d'adhésion, en ligne ou sur papier, et en acceptant les présents statuts.",
      },
      {
        p: "Le comité statue sur les demandes d'admission. Il peut refuser une admission sans indication de motifs ; la personne concernée peut alors recourir devant l'assemblée générale suivante, qui statue définitivement.",
      },
      { p: "La qualité de membre est acquise après acceptation par le comité et paiement de la première cotisation." },
    ],
  },
  {
    id: "cotisation",
    title: "Cotisation",
    blocks: [
      {
        p: "Le montant de la cotisation annuelle est fixé chaque année par l'assemblée générale, sur proposition du comité. Il ne peut pas dépasser le double du montant de l'année précédente.",
      },
      { dl: [["Membres actifs", s.fee], ["Membres juniors", s.juniorFee], ["Membres d'honneur", "Exonérés"]] },
      {
        p: "La cotisation est due pour l'exercice en cours, quelle que soit la date d'admission. Elle n'est pas remboursée en cas de démission ou d'exclusion.",
      },
    ],
  },
  {
    id: "perte-qualite",
    title: "Perte de la qualité de membre",
    blocks: [
      { p: "La qualité de membre se perd :" },
      {
        ul: [
          `par démission, adressée par écrit au comité, y compris par e-mail à ${email} ; elle prend effet immédiatement ;`,
          "par le non-paiement de la cotisation trois mois après son échéance, malgré un rappel ;",
          "par exclusion ;",
          "par décès.",
        ],
      },
    ],
  },
  {
    id: "exclusion",
    title: "Exclusion",
    blocks: [
      {
        p: "Le comité peut exclure un membre qui porte atteinte aux intérêts ou à l'image de l'association, qui enfreint gravement les présents statuts, la charte du supporter ou les règlements des stades, ou qui fait l'objet d'une interdiction de stade.",
      },
      {
        p: "Le membre est entendu au préalable. La décision lui est communiquée par écrit ; il peut recourir dans les 30 jours devant l'assemblée générale, qui statue définitivement. Le recours n'a pas d'effet suspensif.",
      },
    ],
  },
  // III. Organisation
  {
    id: "organes",
    title: "Organes",
    blocks: [
      { p: "Les organes de l'association sont :" },
      { ul: ["l'assemblée générale ;", "le comité ;", "les vérificateurs des comptes."] },
    ],
  },
  {
    id: "assemblee-generale",
    title: "Assemblée générale",
    blocks: [
      {
        p: `L'assemblée générale est l'organe suprême de l'association. Elle se réunit en séance ordinaire une fois par an, au plus tard ${s.assemblyBy}.`,
      },
      {
        p: "Elle est convoquée par le comité au moins 20 jours à l'avance, par e-mail ou par tout autre moyen écrit. La convocation indique l'ordre du jour. Les propositions des membres doivent parvenir au comité au moins 10 jours avant l'assemblée.",
      },
      {
        p: "L'assemblée peut se tenir en présentiel, en ligne ou sous forme mixte, à condition que l'identité des participants et l'exercice du droit de vote soient garantis.",
      },
    ],
  },
  {
    id: "competences-ag",
    title: "Compétences de l'assemblée générale",
    blocks: [
      { p: "L'assemblée générale :" },
      {
        ul: [
          "approuve le procès-verbal de la précédente assemblée ;",
          "approuve le rapport annuel du comité, les comptes et le rapport des vérificateurs ;",
          "donne décharge au comité ;",
          "élit le président ou la présidente, les autres membres du comité et les vérificateurs des comptes ;",
          "fixe le montant des cotisations et approuve le budget ;",
          "nomme les membres d'honneur ;",
          "statue sur les recours en matière d'admission et d'exclusion ;",
          "modifie les statuts ;",
          "décide de la dissolution de l'association.",
        ],
      },
    ],
  },
  {
    id: "decisions",
    title: "Décisions",
    blocks: [
      {
        p: "L'assemblée générale régulièrement convoquée délibère valablement quel que soit le nombre de membres présents. Chaque membre disposant du droit de vote a une voix ; le vote par procuration n'est pas admis.",
      },
      {
        p: "Les décisions et élections sont prises à la majorité simple des voix exprimées ; en cas d'égalité, la voix du président ou de la présidente est prépondérante. La modification des statuts et la dissolution requièrent la majorité des deux tiers des voix exprimées.",
      },
      {
        p: "Les votes ont lieu à main levée, ou à bulletin secret si un cinquième des membres présents le demande. Les décisions font l'objet d'un procès-verbal signé par le président ou la présidente et par le ou la secrétaire.",
      },
    ],
  },
  {
    id: "assemblee-extraordinaire",
    title: "Assemblée générale extraordinaire",
    blocks: [
      {
        p: "Une assemblée générale extraordinaire est convoquée par le comité chaque fois qu'il le juge nécessaire, ou à la demande écrite d'un cinquième des membres disposant du droit de vote. Dans ce dernier cas, elle se tient dans les 6 semaines suivant la demande.",
      },
    ],
  },
  {
    id: "comite",
    title: "Comité",
    blocks: [
      {
        p: `Le comité se compose de ${s.committeeMin} à ${s.committeeMax} membres élus par l'assemblée générale pour deux ans et rééligibles. Il comprend au moins un président ou une présidente, un ou une secrétaire et un trésorier ou une trésorière ; pour le reste, il se constitue lui-même.`,
      },
      {
        p: "Le comité se réunit aussi souvent que les affaires l'exigent, sur convocation de son président ou de sa présidente ou à la demande de deux de ses membres. Il délibère valablement lorsque la majorité de ses membres est présente, y compris à distance ; ses décisions sont prises à la majorité simple.",
      },
      { p: "Les membres du comité agissent bénévolement. Leurs frais effectifs peuvent être remboursés sur justificatif." },
    ],
  },
  {
    id: "competences-comite",
    title: "Compétences du comité",
    blocks: [
      { p: "Le comité dirige l'association et dispose de toutes les compétences qui ne sont pas attribuées à un autre organe. Il notamment :" },
      {
        ul: [
          "exécute les décisions de l'assemblée générale et gère les affaires courantes ;",
          "statue sur les admissions et les exclusions ;",
          "organise les activités, les déplacements et la répartition des billets ;",
          "tient la liste des membres et les comptes ;",
          "représente l'association auprès du Paris Saint-Germain, des autorités et des tiers ;",
          "peut constituer des groupes de travail et adopter des règlements internes.",
        ],
      },
    ],
  },
  {
    id: "representation",
    title: "Représentation",
    blocks: [
      {
        p: "L'association est valablement engagée par la signature collective à deux du président ou de la présidente et d'un autre membre du comité. Pour les affaires courantes, le comité peut accorder une signature individuelle jusqu'à un montant qu'il fixe.",
      },
    ],
  },
  {
    id: "verificateurs",
    title: "Vérificateurs des comptes",
    blocks: [
      {
        p: "L'assemblée générale élit chaque année deux vérificateurs ou vérificatrices des comptes, qui ne font pas partie du comité. Ils contrôlent les comptes et présentent un rapport écrit à l'assemblée générale ordinaire.",
      },
    ],
  },
  // IV. Finances
  {
    id: "exercice",
    title: "Exercice et comptes",
    blocks: [
      { p: `L'exercice social se termine le ${s.fiscalYearEnd} de chaque année. Le trésorier ou la trésorière tient les comptes et les présente au comité, puis aux vérificateurs.` },
    ],
  },
  {
    id: "responsabilite",
    title: "Responsabilité",
    blocks: [
      {
        p: "Les engagements de l'association sont garantis uniquement par sa fortune sociale. Toute responsabilité personnelle des membres est exclue au-delà du paiement de la cotisation.",
      },
    ],
  },
  // V. Dispositions particulières
  {
    id: "billetterie",
    title: "Billetterie et déplacements",
    blocks: [
      {
        p: "Les billets obtenus par l'intermédiaire de l'association sont nominatifs et réservés aux membres à jour de leur cotisation. Leur revente, en particulier à un prix supérieur à leur valeur faciale, est interdite et peut entraîner l'exclusion.",
      },
      {
        p: "Lors des déplacements organisés, chaque membre respecte les consignes des organisateurs et les règlements des stades. Il répond personnellement de son comportement et des dommages qu'il cause.",
      },
    ],
  },
  {
    id: "relations-psg",
    title: "Relations avec le Paris Saint-Germain",
    blocks: [
      {
        p: "L'association est un club de supporters officiel du Paris Saint-Germain. Elle respecte le cahier des charges des clubs de supporters officiels et utilise le nom, l'écusson et les marques du club dans les limites autorisées par celui-ci.",
      },
      { p: "L'association reste juridiquement et financièrement indépendante du Paris Saint-Germain Football Club." },
    ],
  },
  {
    id: "donnees",
    title: "Protection des données",
    blocks: [
      {
        p: "L'association traite les données personnelles de ses membres uniquement pour la poursuite de ses buts, conformément à la loi fédérale sur la protection des données et à sa politique de confidentialité. Elle ne les transmet pas à des tiers, sauf au Paris Saint-Germain dans la mesure nécessaire à la billetterie et avec l'accord du membre concerné.",
      },
    ],
  },
  // VI. Dispositions finales
  {
    id: "modification",
    title: "Modification des statuts",
    blocks: [
      {
        p: "Les statuts peuvent être modifiés par l'assemblée générale à la majorité des deux tiers des voix exprimées, à condition que la modification figure à l'ordre du jour de la convocation.",
      },
    ],
  },
  {
    id: "dissolution",
    title: "Dissolution",
    blocks: [
      {
        p: "La dissolution de l'association est décidée par une assemblée générale convoquée à cet effet, à la majorité des deux tiers des voix exprimées.",
      },
      {
        p: "En cas de dissolution, la fortune restante est attribuée à une organisation à but non lucratif poursuivant des buts analogues ou d'utilité publique, désignée par l'assemblée générale. Elle ne peut en aucun cas être répartie entre les membres.",
      },
    ],
  },
  {
    id: "entree-en-vigueur",
    title: "Entrée en vigueur",
    blocks: [
      { p: `Les présents statuts ont été adoptés par l'assemblée générale du ${s.adoptedAt} à ${s.adoptedIn}. Ils entrent en vigueur immédiatement.` },
      {
        dl: [
          ["Président·e", s.president],
          ["Secrétaire", s.secretary],
          ["Siège", LEGAL_ADDRESS],
        ],
      },
    ],
  },
];
