export type MatchResponseStatus =
  | "present"
  | "absent"
  | "pending";

export type MatchTone =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "red";

export type OrganizationIcon =
  | "venue"
  | "referees"
  | "scoreTable"
  | "transport"
  | "jerseys"
  | "sheet";

export type PracticalIcon =
  | "appointment"
  | "coach"
  | "assistant"
  | "lockerRoom"
  | "outfit"
  | "emergency"
  | "notes";

export const matchDetails = {
  id: "u15-garcons-vs-as-basket",

  homeTeam: {
    name: "U15 Garçons",
    club: "Basket Club Exemple",
    initials: "BCC",
  },

  awayTeam: {
    name: "AS Basket",
    club: "Chaponost",
    initials: "ASB",
  },

  competition: "Championnat Départemental",
  phase: "Phase 2",
  date: "Samedi 25 mai 2024",
  time: "15h30",

  location: {
    name: "Gymnase Jean Moulin",
    address: "12 Rue Jean Moulin, 69008 Lyon",
  },

  homeMatch: true,
  invitationSent: true,
};

export const matchOrganization = [
  {
    id: 1,
    label: "Salle confirmée",
    status: "Confirmée",
    tone: "green",
    icon: "venue",
  },
  {
    id: 2,
    label: "Arbitres",
    status: "Désignés",
    tone: "green",
    icon: "referees",
  },
  {
    id: 3,
    label: "Table de marque",
    status: "OK",
    tone: "green",
    icon: "scoreTable",
  },
  {
    id: 4,
    label: "Transport",
    status: "À confirmer",
    tone: "orange",
    icon: "transport",
  },
  {
    id: 5,
    label: "Maillots",
    status: "Disponibles",
    tone: "green",
    icon: "jerseys",
  },
  {
    id: 6,
    label: "Feuille de match",
    status: "Prête",
    tone: "green",
    icon: "sheet",
  },
] satisfies Array<{
  id: number;
  label: string;
  status: string;
  tone: "green" | "orange";
  icon: OrganizationIcon;
}>;

export const invitedPlayers = [
  {
    id: 1,
    number: 4,
    name: "Lucas Bernard",
    position: "Meneur",
    response: "present",
    responseLabel: "Présent",
    lastResponse: "20 mai 2024",
    comment: "Peut être en avance",
  },
  {
    id: 2,
    number: 5,
    name: "Sami Ben Ali",
    position: "Arrière",
    response: "present",
    responseLabel: "Présent",
    lastResponse: "19 mai 2024",
    comment: "—",
  },
  {
    id: 3,
    number: 6,
    name: "Théo Fontaine",
    position: "Ailier",
    response: "absent",
    responseLabel: "Absent",
    lastResponse: "18 mai 2024",
    comment: "Anniversaire",
  },
  {
    id: 4,
    number: 7,
    name: "Mathis Leroy",
    position: "Ailier fort",
    response: "pending",
    responseLabel: "En attente",
    lastResponse: "—",
    comment: "—",
  },
  {
    id: 5,
    number: 8,
    name: "Hugo Martin",
    position: "Pivot",
    response: "present",
    responseLabel: "Présent",
    lastResponse: "20 mai 2024",
    comment: "—",
  },
  {
    id: 6,
    number: 9,
    name: "Léo Petit",
    position: "Meneur",
    response: "pending",
    responseLabel: "En attente",
    lastResponse: "18 mai 2024",
    comment: "En attente de ses parents",
  },
  {
    id: 7,
    number: 10,
    name: "Noa Dupont",
    position: "Arrière",
    response: "present",
    responseLabel: "Présent",
    lastResponse: "19 mai 2024",
    comment: "—",
  },
  {
    id: 8,
    number: 11,
    name: "Gabin Morel",
    position: "Ailier",
    response: "absent",
    responseLabel: "Absent",
    lastResponse: "18 mai 2024",
    comment: "Malade",
  },
] satisfies Array<{
  id: number;
  number: number;
  name: string;
  position: string;
  response: MatchResponseStatus;
  responseLabel: string;
  lastResponse: string;
  comment: string;
}>;

export const practicalInformation = [
  {
    id: 1,
    label: "Rendez-vous",
    value: "13h45 au gymnase",
    secondaryValue: "",
    icon: "appointment",
  },
  {
    id: 2,
    label: "Coach principal",
    value: "Julien Moreau",
    secondaryValue: "06 12 34 56 78",
    icon: "coach",
  },
  {
    id: 3,
    label: "Assistant",
    value: "Antoine Girard",
    secondaryValue: "06 23 45 67 89",
    icon: "assistant",
  },
  {
    id: 4,
    label: "Vestiaire",
    value: "Vestiaire 2",
    secondaryValue: "",
    icon: "lockerRoom",
  },
  {
    id: 5,
    label: "Tenue",
    value: "Maillot bleu / Short bleu",
    secondaryValue: "",
    icon: "outfit",
  },
  {
    id: 6,
    label: "Contact d’urgence",
    value: "Paul Martin (Parent)",
    secondaryValue: "06 98 76 54 32",
    icon: "emergency",
  },
  {
    id: 7,
    label: "Notes",
    value:
      "Prévoir des bouteilles d’eau. Arriver 15 minutes avant l’échauffement.",
    secondaryValue: "",
    icon: "notes",
  },
] satisfies Array<{
  id: number;
  label: string;
  value: string;
  secondaryValue: string;
  icon: PracticalIcon;
}>;

export const matchMessages = [
  {
    id: 1,
    title: "Convocation envoyée",
    description:
      "La convocation a été envoyée aux joueurs et aux parents.",
    time: "Il y a 2 jours",
    tone: "purple",
  },
  {
    id: 2,
    title: "Information arbitres",
    description:
      "Les arbitres officiels ont été désignés par le comité pour ce match.",
    time: "Il y a 3 jours",
    tone: "blue",
  },
  {
    id: 3,
    title: "Horaire confirmé",
    description: "Le match est confirmé à 15h30.",
    time: "Il y a 4 jours",
    tone: "orange",
  },
] satisfies Array<{
  id: number;
  title: string;
  description: string;
  time: string;
  tone: MatchTone;
}>;

export const matchRecentActivity = [
  {
    id: 1,
    title: "Convocation envoyée",
    description: "Par Thomas Administrateur",
    time: "Il y a 2 jours",
    tone: "blue",
  },
  {
    id: 2,
    title: "Lucas Bernard a répondu présent",
    description: "Réponse via SportEasy",
    time: "Il y a 2 jours",
    tone: "green",
  },
  {
    id: 3,
    title: "Salle confirmée",
    description: "Gymnase Jean Moulin réservé",
    time: "Il y a 3 jours",
    tone: "orange",
  },
] satisfies Array<{
  id: number;
  title: string;
  description: string;
  time: string;
  tone: MatchTone;
}>;