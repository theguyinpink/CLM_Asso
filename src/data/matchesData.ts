import {
  CalendarDays,
  CircleAlert,
  Clock3,
  Trophy,
} from "lucide-react";

export type MatchListStatus =
  | "scheduled"
  | "pending"
  | "completed"
  | "cancelled";

export type MatchVenue = "home" | "away";

export interface MatchListItem {
  id: string;
  date: string;
  time: string;

  clubTeam: string;
  opponent: string;

  competition: string;
  phase: string;

  location: string;
  venue: MatchVenue;

  status: MatchListStatus;
  statusLabel: string;

  invitedPlayers: number;
  responses: number;
  presentPlayers: number;

  organizationProgress: number;

  clubScore?: number;
  opponentScore?: number;
}

export const matchesStats = [
  {
    label: "Matchs à venir",
    value: 24,
    detail: "6 cette semaine",
    tone: "blue",
    icon: CalendarDays,
  },
  {
    label: "À confirmer",
    value: 3,
    detail: "Organisation incomplète",
    tone: "orange",
    icon: CircleAlert,
  },
  {
    label: "Cette semaine",
    value: 8,
    detail: "5 à domicile",
    tone: "green",
    icon: Clock3,
  },
  {
    label: "Matchs terminés",
    value: 42,
    detail: "Depuis le début de saison",
    tone: "purple",
    icon: Trophy,
  },
] as const;

export const matchesData: MatchListItem[] = [
  {
    id: "u15-garcons-vs-as-basket",
    date: "2024-05-25",
    time: "15:30",
    clubTeam: "U15 Garçons",
    opponent: "AS Basket",
    competition: "Championnat Départemental",
    phase: "Phase 2",
    location: "Gymnase Jean Moulin",
    venue: "home",
    status: "scheduled",
    statusLabel: "Confirmé",
    invitedPlayers: 12,
    responses: 10,
    presentPlayers: 8,
    organizationProgress: 83,
  },
  {
    id: "seniors-1-vs-etoile-sportive",
    date: "2024-05-25",
    time: "19:00",
    clubTeam: "Seniors 1",
    opponent: "Étoile Sportive",
    competition: "Pré-Régionale",
    phase: "Journée 22",
    location: "Gymnase Jean Moulin",
    venue: "home",
    status: "pending",
    statusLabel: "À confirmer",
    invitedPlayers: 12,
    responses: 9,
    presentPlayers: 8,
    organizationProgress: 62,
  },
  {
    id: "u18-filles-vs-bc-ouest",
    date: "2024-05-26",
    time: "10:00",
    clubTeam: "U18 Filles",
    opponent: "BC Ouest",
    competition: "Championnat Départemental",
    phase: "Phase 2",
    location: "Gymnase du Parc",
    venue: "away",
    status: "scheduled",
    statusLabel: "Confirmé",
    invitedPlayers: 12,
    responses: 9,
    presentPlayers: 7,
    organizationProgress: 76,
  },
  {
    id: "u13-garcons-vs-entente-sud",
    date: "2024-05-26",
    time: "13:30",
    clubTeam: "U13 Garçons",
    opponent: "Entente Sud",
    competition: "Championnat Départemental",
    phase: "Journée 18",
    location: "Complexe sportif du Sud",
    venue: "away",
    status: "pending",
    statusLabel: "Horaire à confirmer",
    invitedPlayers: 14,
    responses: 8,
    presentPlayers: 7,
    organizationProgress: 48,
  },
  {
    id: "u11-filles-vs-melun-basket",
    date: "2024-06-01",
    time: "14:00",
    clubTeam: "U11 Filles",
    opponent: "Melun Basket",
    competition: "Championnat U11",
    phase: "Plateau final",
    location: "Gymnase Les Lilas",
    venue: "home",
    status: "scheduled",
    statusLabel: "Confirmé",
    invitedPlayers: 12,
    responses: 6,
    presentPlayers: 6,
    organizationProgress: 71,
  },
  {
    id: "seniors-2-vs-basket-nord",
    date: "2024-06-02",
    time: "15:00",
    clubTeam: "Seniors 2",
    opponent: "Basket Nord",
    competition: "Départementale 2",
    phase: "Journée 20",
    location: "Gymnase Basket Nord",
    venue: "away",
    status: "scheduled",
    statusLabel: "Confirmé",
    invitedPlayers: 11,
    responses: 5,
    presentPlayers: 5,
    organizationProgress: 67,
  },
  {
    id: "u15-garcons-vs-bc-ouest-termine",
    date: "2024-05-11",
    time: "15:30",
    clubTeam: "U15 Garçons",
    opponent: "BC Ouest",
    competition: "Championnat Départemental",
    phase: "Phase 2",
    location: "Gymnase Jean Moulin",
    venue: "home",
    status: "completed",
    statusLabel: "Terminé",
    invitedPlayers: 12,
    responses: 12,
    presentPlayers: 10,
    organizationProgress: 100,
    clubScore: 68,
    opponentScore: 54,
  },
  {
    id: "seniors-1-vs-bc-centre-termine",
    date: "2024-05-18",
    time: "20:30",
    clubTeam: "Seniors 1",
    opponent: "BC Centre",
    competition: "Pré-Régionale",
    phase: "Journée 21",
    location: "Gymnase BC Centre",
    venue: "away",
    status: "completed",
    statusLabel: "Terminé",
    invitedPlayers: 12,
    responses: 12,
    presentPlayers: 11,
    organizationProgress: 100,
    clubScore: 71,
    opponentScore: 76,
  },
];

export const matchOrganisationAlerts = [
  {
    id: 1,
    title: "Transport à confirmer",
    description: "U15 Garçons vs AS Basket",
    tone: "orange",
  },
  {
    id: 2,
    title: "Horaire non confirmé",
    description: "U13 Garçons vs Entente Sud",
    tone: "red",
  },
  {
    id: 3,
    title: "6 joueurs n’ont pas répondu",
    description: "U11 Filles vs Melun Basket",
    tone: "purple",
  },
] as const;

export const weekMatchSummary = [
  {
    day: "Sam. 25 mai",
    count: 2,
  },
  {
    day: "Dim. 26 mai",
    count: 2,
  },
  {
    day: "Sam. 1 juin",
    count: 1,
  },
  {
    day: "Dim. 2 juin",
    count: 1,
  },
] as const;