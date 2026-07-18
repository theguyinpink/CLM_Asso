import {
  Clock3,
  Mail,
  MessageCircleMore,
  PieChart,
  UserRoundX,
} from "lucide-react";

export type ConvocationStatus =
  | "sent"
  | "reminder"
  | "complete"
  | "draft";

export type PlayerResponseStatus =
  | "present"
  | "absent"
  | "pending"
  | "unanswered";

export interface ConvocationRecord {
  id: string;
  matchId?: string;

  title: string;
  team: string;

  date: string;
  time: string;

  location: string;
  competition: string;
  phase: string;

  invited: number;
  responses: number;

  present: number;
  absent: number;
  pending: number;
  unanswered: number;

  status: ConvocationStatus;
  statusLabel: string;
}

export interface ConvokedPlayer {
  id: number;
  number: number;
  name: string;
  position: string;

  response: PlayerResponseStatus;
  responseLabel: string;

  responseDate: string;
  comment: string;
}

export const convocationStats = [
  {
    label: "Convocations envoyées",
    value: 18,
    detail: "Sur les 30 derniers jours",
    tone: "blue",
    icon: Mail,
  },
  {
    label: "Réponses reçues",
    value: 143,
    detail: "Sur les 30 derniers jours",
    tone: "green",
    icon: MessageCircleMore,
  },
  {
    label: "Absents",
    value: 21,
    detail: "Sur les 30 derniers jours",
    tone: "red",
    icon: UserRoundX,
  },
  {
    label: "En attente",
    value: 17,
    detail: "Sur les 30 derniers jours",
    tone: "orange",
    icon: Clock3,
  },
  {
    label: "Taux de réponse",
    value: "86 %",
    detail: "Sur les 30 derniers jours",
    tone: "purple",
    icon: PieChart,
  },
] as const;

export const convocations: ConvocationRecord[] = [
  {
    id: "convocation-u15-as-basket",
    matchId: "u15-garcons-vs-as-basket",

    title: "U15 Garçons vs AS Basket",
    team: "U15 Garçons",

    date: "2024-05-25",
    time: "15:30",

    location:
      "Gymnase Jean Moulin, 12 Rue Jean Moulin, 69008 Lyon",
    competition: "Championnat Départemental",
    phase: "Phase 2",

    invited: 12,
    responses: 10,

    present: 8,
    absent: 1,
    pending: 1,
    unanswered: 2,

    status: "sent",
    statusLabel: "Envoyée",
  },
  {
    id: "convocation-u18-as-basket",

    title: "U18 Filles vs AS Basket",
    team: "U18 Filles",

    date: "2024-05-26",
    time: "17:00",

    location: "Gymnase des Prés",
    competition: "Championnat Départemental",
    phase: "Journée 20",

    invited: 11,
    responses: 7,

    present: 6,
    absent: 1,
    pending: 2,
    unanswered: 2,

    status: "reminder",
    statusLabel: "À relancer",
  },
  {
    id: "convocation-seniors-etoile",

    title: "Seniors 1 vs Étoile Sportive",
    team: "Seniors 1",

    date: "2024-05-31",
    time: "20:30",

    location: "Gymnase Jean Moulin",
    competition: "Pré-Régionale",
    phase: "Journée 22",

    invited: 14,
    responses: 12,

    present: 11,
    absent: 1,
    pending: 0,
    unanswered: 2,

    status: "complete",
    statusLabel: "Complète",
  },
  {
    id: "convocation-entrainement-u13",

    title: "Entraînement U13 Filles",
    team: "U13 Filles",

    date: "2024-05-28",
    time: "18:00",

    location: "Gymnase Les Lilas",
    competition: "Entraînement",
    phase: "Séance habituelle",

    invited: 10,
    responses: 6,

    present: 5,
    absent: 1,
    pending: 2,
    unanswered: 2,

    status: "reminder",
    statusLabel: "À relancer",
  },
  {
    id: "convocation-u15-filles-lyon",

    title: "U15 Filles vs Lyon Basket",
    team: "U15 Filles",

    date: "2024-06-01",
    time: "16:00",

    location: "Gymnase Lyon Basket",
    competition: "Championnat Départemental",
    phase: "Phase finale",

    invited: 12,
    responses: 9,

    present: 8,
    absent: 1,
    pending: 1,
    unanswered: 2,

    status: "sent",
    statusLabel: "Envoyée",
  },
];

export const convokedPlayers: ConvokedPlayer[] = [
  {
    id: 1,
    number: 4,
    name: "Lucas Bernard",
    position: "Meneur",
    response: "present",
    responseLabel: "Présent",
    responseDate: "20 mai 2024",
    comment: "Peut être en avance",
  },
  {
    id: 2,
    number: 5,
    name: "Sami Ben Ali",
    position: "Arrière",
    response: "present",
    responseLabel: "Présent",
    responseDate: "19 mai 2024",
    comment: "—",
  },
  {
    id: 3,
    number: 6,
    name: "Théo Fontaine",
    position: "Ailier",
    response: "absent",
    responseLabel: "Absent",
    responseDate: "18 mai 2024",
    comment: "Anniversaire",
  },
  {
    id: 4,
    number: 7,
    name: "Mathis Leroy",
    position: "Ailier fort",
    response: "pending",
    responseLabel: "En attente",
    responseDate: "—",
    comment: "En attente des parents",
  },
  {
    id: 5,
    number: 8,
    name: "Hugo Martin",
    position: "Pivot",
    response: "present",
    responseLabel: "Présent",
    responseDate: "20 mai 2024",
    comment: "—",
  },
  {
    id: 6,
    number: 9,
    name: "Léo Petit",
    position: "Meneur",
    response: "present",
    responseLabel: "Présent",
    responseDate: "18 mai 2024",
    comment: "—",
  },
  {
    id: 7,
    number: 10,
    name: "Noa Dupont",
    position: "Arrière",
    response: "pending",
    responseLabel: "En attente",
    responseDate: "—",
    comment: "En attente",
  },
  {
    id: 8,
    number: 11,
    name: "Gabin Morel",
    position: "Ailier",
    response: "absent",
    responseLabel: "Absent",
    responseDate: "18 mai 2024",
    comment: "Malade",
  },
];

export const convocationActivity = [
  {
    id: 1,
    title: "Lucas Bernard a confirmé sa présence",
    description: "U15 Garçons vs AS Basket",
    time: "Il y a 15 minutes",
    type: "confirmed",
  },
  {
    id: 2,
    title: "Convocation envoyée pour le match U18 Filles",
    description: "26 mai 2024 à 17h00",
    time: "Il y a 1 heure",
    type: "sent",
  },
  {
    id: 3,
    title: "Relance envoyée aux joueurs en attente",
    description: "Entraînement U13 Filles",
    time: "Il y a 2 heures",
    type: "reminder",
  },
  {
    id: 4,
    title: "Sami Ben Ali a confirmé sa présence",
    description: "U15 Garçons vs AS Basket",
    time: "Il y a 3 heures",
    type: "confirmed",
  },
  {
    id: 5,
    title: "Convocation envoyée pour le match U15 Garçons",
    description: "25 mai 2024 à 15h30",
    time: "Il y a 1 jour",
    type: "sent",
  },
] as const;