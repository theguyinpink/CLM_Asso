import {
  Layers3,
  Trophy,
  UserRoundCog,
  UsersRound,
} from "lucide-react";

export type TeamTone =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "yellow";

export interface Team {
  id: string;
  name: string;
  category: string;
  categoryTone: TeamTone;
  coach: string;
  memberCount: number;
  memberLabel: string;
  nextTraining: string;
  nextMatchDate: string;
  nextOpponent: string;
  memberInitials: string[];
}

export const teamStats = [
  {
    label: "Équipes",
    value: 12,
    detail: "+1 ce mois-ci",
    tone: "blue",
    icon: UsersRound,
  },
  {
    label: "Membres",
    value: 128,
    detail: "+5 ce mois-ci",
    tone: "green",
    icon: UsersRound,
  },
  {
    label: "Entraîneurs",
    value: 9,
    detail: "+1 ce mois-ci",
    tone: "orange",
    icon: UserRoundCog,
  },
  {
    label: "Catégories",
    value: 4,
    detail: "Mini, jeunes, seniors…",
    tone: "purple",
    icon: Layers3,
  },
] as const;

export const teams: Team[] = [
  {
    id: "u11-filles",
    name: "U11 Filles",
    category: "Jeunes",
    categoryTone: "green",
    coach: "Sophie Martin",
    memberCount: 12,
    memberLabel: "joueuses",
    nextTraining: "Mer. 29 mai • 17h30",
    nextMatchDate: "Sam. 1 juin • 14h00",
    nextOpponent: "vs AS Basket",
    memberInitials: ["SM", "LB", "AG", "+3"],
  },
  {
    id: "u13-garcons",
    name: "U13 Garçons",
    category: "Jeunes",
    categoryTone: "green",
    coach: "Lucas Bernard",
    memberCount: 14,
    memberLabel: "joueurs",
    nextTraining: "Mer. 29 mai • 18h00",
    nextMatchDate: "Sam. 1 juin • 16h30",
    nextOpponent: "vs Entente Sud",
    memberInitials: ["LB", "AM", "JM", "+2"],
  },
  {
    id: "u15-garcons",
    name: "U15 Garçons",
    category: "Jeunes",
    categoryTone: "green",
    coach: "Julien Moreau",
    memberCount: 13,
    memberLabel: "joueurs",
    nextTraining: "Jeu. 30 mai • 18h30",
    nextMatchDate: "Dim. 2 juin • 11h00",
    nextOpponent: "vs BC Nord",
    memberInitials: ["JM", "PL", "TC", "+2"],
  },
  {
    id: "u18-filles",
    name: "U18 Filles",
    category: "Jeunes",
    categoryTone: "green",
    coach: "Claire Dupont",
    memberCount: 12,
    memberLabel: "joueuses",
    nextTraining: "Mar. 28 mai • 19h00",
    nextMatchDate: "Sam. 1 juin • 18h00",
    nextOpponent: "vs AS Basket",
    memberInitials: ["CD", "SM", "LB", "+2"],
  },
  {
    id: "seniors-1",
    name: "Seniors 1",
    category: "Seniors",
    categoryTone: "blue",
    coach: "Thomas Charpentier",
    memberCount: 12,
    memberLabel: "joueurs",
    nextTraining: "Mer. 29 mai • 20h30",
    nextMatchDate: "Sam. 1 juin • 20h30",
    nextOpponent: "vs BC Ouest",
    memberInitials: ["TC", "JM", "PH", "+1"],
  },
  {
    id: "seniors-2",
    name: "Seniors 2",
    category: "Seniors",
    categoryTone: "blue",
    coach: "Pierre Lemoine",
    memberCount: 11,
    memberLabel: "joueurs",
    nextTraining: "Ven. 31 mai • 20h00",
    nextMatchDate: "Dim. 2 juin • 15h00",
    nextOpponent: "vs Entente Sud",
    memberInitials: ["PL", "AM", "TC", "+1"],
  },
  {
    id: "loisirs",
    name: "Loisirs",
    category: "Loisirs",
    categoryTone: "yellow",
    coach: "Antoine Girard",
    memberCount: 18,
    memberLabel: "joueurs",
    nextTraining: "Lun. 3 juin • 19h30",
    nextMatchDate: "Ven. 7 juin • 20h00",
    nextOpponent: "Match amical",
    memberInitials: ["AG", "LB", "CD", "+2"],
  },
  {
    id: "mini-basket",
    name: "Mini-Basket",
    category: "Mini-Basket",
    categoryTone: "purple",
    coach: "Mélanie Roux",
    memberCount: 16,
    memberLabel: "joueurs et joueuses",
    nextTraining: "Sam. 1 juin • 10h00",
    nextMatchDate: "Sam. 8 juin • 10h30",
    nextOpponent: "Plateau à domicile",
    memberInitials: ["MR", "SM", "AG", "+2"],
  },
];

export const categoryDistribution = [
  {
    label: "Mini-Basket",
    count: 1,
    percentage: 8,
    tone: "purple",
  },
  {
    label: "Jeunes",
    count: 7,
    percentage: 58,
    tone: "green",
  },
  {
    label: "Seniors",
    count: 3,
    percentage: 25,
    tone: "blue",
  },
  {
    label: "Loisirs",
    count: 1,
    percentage: 8,
    tone: "yellow",
  },
];

export const mainCoaches = [
  {
    initials: "TC",
    name: "Thomas Charpentier",
    role: "Entraîneur principal",
    team: "Seniors 1",
    since: "Depuis sept. 2022",
    members: 12,
  },
  {
    initials: "SM",
    name: "Sophie Martin",
    role: "Entraîneure principale",
    team: "U11 Filles",
    since: "Depuis sept. 2023",
    members: 12,
  },
  {
    initials: "JM",
    name: "Julien Moreau",
    role: "Entraîneur principal",
    team: "U15 Garçons",
    since: "Depuis sept. 2022",
    members: 13,
  },
];

export const teamTrophyIcon = Trophy;