import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  Megaphone,
  MessageSquareText,
  Trophy,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

export const dashboardStats = [
  {
    label: "Équipes",
    value: 12,
    detail: "+1 ce mois-ci",
    tone: "blue",
    icon: UsersRound,
  },
  {
    label: "Matchs à venir",
    value: 24,
    detail: "+6 cette semaine",
    tone: "green",
    icon: CalendarDays,
  },
  {
    label: "Tâches en attente",
    value: 8,
    detail: "-2 depuis hier",
    tone: "orange",
    icon: ListChecks,
  },
  {
    label: "Convocations",
    value: 35,
    detail: "12 en attente",
    tone: "purple",
    icon: ClipboardCheck,
  },
  {
    label: "Annonces",
    value: 6,
    detail: "2 non lues",
    tone: "blue",
    icon: Megaphone,
  },
  {
    label: "Membres",
    value: 128,
    detail: "+5 ce mois-ci",
    tone: "green",
    icon: UserRoundCheck,
  },
] as const;

export const upcomingMatches = [
  {
    id: 1,
    day: "SAM.",
    date: "25",
    month: "MAI",
    team: "U15 Garçons",
    opponent: "Basket Club Sud",
    time: "15h30",
    location: "Gymnase Léo Lagrange",
    venue: "Domicile",
  },
  {
    id: 2,
    day: "DIM.",
    date: "26",
    month: "MAI",
    team: "U18 Filles",
    opponent: "AS Basket",
    time: "10h00",
    location: "Gymnase Jean Moulin",
    venue: "Extérieur",
  },
  {
    id: 3,
    day: "DIM.",
    date: "26",
    month: "MAI",
    team: "Seniors 1",
    opponent: "Étoile Sportive",
    time: "16h00",
    location: "Gymnase des Prés",
    venue: "Domicile",
  },
];

export const latestAnnouncements = [
  {
    id: 1,
    title: "Entraînement annulé",
    description: "L’entraînement des U13 de ce soir est annulé.",
    time: "Il y a 1 h",
    icon: CalendarDays,
    tone: "orange",
  },
  {
    id: 2,
    title: "Tournoi de Pentecôte",
    description: "Merci de vous inscrire avant le 15 mai.",
    time: "Il y a 1 j",
    icon: Trophy,
    tone: "blue",
  },
  {
    id: 3,
    title: "Réunion bénévoles",
    description: "Réunion le mercredi 29 mai à 19 h au club.",
    time: "Il y a 2 j",
    icon: UsersRound,
    tone: "purple",
  },
];

export const tasks = [
  {
    id: 1,
    title: "Valider les licences en attente",
    description: "8 licences à vérifier",
    priority: "Haute",
    tone: "red",
  },
  {
    id: 2,
    title: "Préparer le tournoi U15",
    description: "Checklist organisation",
    priority: "Moyenne",
    tone: "blue",
  },
  {
    id: 3,
    title: "Relancer les parents U13",
    description: "Inscriptions tournoi",
    priority: "Basse",
    tone: "green",
  },
];

export const pendingInvitations = [
  {
    id: 1,
    title: "U15 Garçons vs Basket Club Sud",
    date: "25 mai 2024 à 15h30",
    responded: 12,
    total: 15,
  },
  {
    id: 2,
    title: "U18 Filles vs AS Basket",
    date: "26 mai 2024 à 10h00",
    responded: 9,
    total: 12,
  },
  {
    id: 3,
    title: "Seniors 1 vs Étoile Sportive",
    date: "26 mai 2024 à 16h00",
    responded: 10,
    total: 14,
  },
];

export const recentActivity = [
  {
    id: 1,
    title: "Paul Martin a confirmé sa présence",
    description: "U15 Garçons vs Basket Club Sud",
    time: "Il y a 15 min",
    icon: CheckCircle2,
    tone: "green",
  },
  {
    id: 2,
    title: "Nouvelle annonce publiée",
    description: "Tournoi de Pentecôte",
    time: "Il y a 1 h",
    icon: Megaphone,
    tone: "orange",
  },
  {
    id: 3,
    title: "Sophie Lefèvre a ajouté un document",
    description: "Planning entraînements — Mai 2024",
    time: "Il y a 3 h",
    icon: MessageSquareText,
    tone: "purple",
  },
];

export const calendarDays = [
  { day: 29, muted: true },
  { day: 30, muted: true },
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4 },
  { day: 5 },

  { day: 6 },
  { day: 7 },
  { day: 8, events: ["green"] },
  { day: 9 },
  { day: 10 },
  { day: 11, events: ["orange"] },
  { day: 12 },

  { day: 13 },
  { day: 14 },
  { day: 15, events: ["green", "blue"] },
  { day: 16 },
  { day: 17 },
  { day: 18 },
  { day: 19 },

  { day: 20 },
  { day: 21 },
  { day: 22 },
  { day: 23 },
  { day: 24 },
  { day: 25, active: true },
  { day: 26 },

  { day: 27 },
  { day: 28 },
  { day: 29, events: ["blue", "red"] },
  { day: 30 },
  { day: 31 },
  { day: 1, muted: true },
  { day: 2, muted: true },
];

export type DashboardTone =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "red";