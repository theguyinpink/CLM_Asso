import {
  CalendarDays,
  Eye,
  FilePenLine,
  Megaphone,
  UsersRound,
} from "lucide-react";

export type AnnouncementStatus =
  | "published"
  | "scheduled"
  | "draft";

export type AnnouncementType =
  | "important"
  | "event"
  | "club"
  | "organization"
  | "information";

export type AnnouncementTone =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "red";

export interface AnnouncementEventDetails {
  title: string;
  date: string;
  location: string;
  audience: string;
  additionalInformation: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;

  audience: string;
  audienceCount: number;

  type: AnnouncementType;
  typeLabel: string;

  status: AnnouncementStatus;
  statusLabel: string;

  publishedAt: string;
  author: string;

  priority: boolean;
  tone: AnnouncementTone;

  eventDetails?: AnnouncementEventDetails;
}

export const announcementStats = [
  {
    label: "Annonces publiées",
    value: 14,
    detail: "+3 ce mois-ci",
    tone: "blue",
    icon: Megaphone,
  },
  {
    label: "Brouillons",
    value: 4,
    detail: "+1 ce mois-ci",
    tone: "orange",
    icon: FilePenLine,
  },
  {
    label: "Programmées",
    value: 3,
    detail: "+2 à venir",
    tone: "green",
    icon: CalendarDays,
  },
  {
    label: "Non lues prioritaires",
    value: 2,
    detail: "Voir les détails",
    tone: "purple",
    icon: Eye,
  },
  {
    label: "Équipes ciblées",
    value: 8,
    detail: "+2 ce mois-ci",
    tone: "green",
    icon: UsersRound,
  },
] as const;

export const announcements: Announcement[] = [
  {
    id: "entrainement-annule-u13",
    title: "Entraînement annulé U13",
    content:
      "L’entraînement des U13 Filles prévu ce vendredi est annulé en raison de l’indisponibilité du gymnase.",

    audience: "U13 Filles",
    audienceCount: 18,

    type: "important",
    typeLabel: "Important",

    status: "published",
    statusLabel: "Publiée",

    publishedAt: "2024-05-24T18:30:00",
    author: "Thomas Coulon",

    priority: true,
    tone: "red",
  },
  {
    id: "tournoi-de-pentecote",
    title: "Tournoi de Pentecôte",
    content:
      "Notre traditionnel tournoi de Pentecôte approche ! Une journée conviviale ouverte à tous les licenciés du club.",

    audience: "Tout le club",
    audienceCount: 312,

    type: "event",
    typeLabel: "Événement",

    status: "published",
    statusLabel: "Publiée",

    publishedAt: "2024-05-23T14:20:00",
    author: "Thomas Coulon",

    priority: false,
    tone: "purple",

    eventDetails: {
      title: "Tournoi de Pentecôte 2024",
      date: "Samedi 15 juin 2024",
      location: "Gymnase Jean Moulin, 69008 Lyon",
      audience: "Ouvert à toutes les catégories du club",
      additionalInformation:
        "Inscriptions avant le 10 juin auprès de vos entraîneurs.",
    },
  },
  {
    id: "reunion-benevoles",
    title: "Réunion bénévoles",
    content:
      "Une réunion d’organisation est prévue pour préparer les prochains événements du club.",

    audience: "Bénévoles",
    audienceCount: 22,

    type: "club",
    typeLabel: "Club",

    status: "published",
    statusLabel: "Publiée",

    publishedAt: "2024-05-22T09:15:00",
    author: "Thomas Coulon",

    priority: false,
    tone: "blue",
  },
  {
    id: "buvette-match-seniors-1",
    title: "Buvette match Seniors 1",
    content:
      "Nous recherchons encore plusieurs bénévoles pour tenir la buvette lors du prochain match des Seniors 1.",

    audience: "Seniors 1",
    audienceCount: 14,

    type: "organization",
    typeLabel: "Organisation",

    status: "published",
    statusLabel: "Publiée",

    publishedAt: "2024-05-21T16:45:00",
    author: "Thomas Coulon",

    priority: false,
    tone: "orange",
  },
  {
    id: "planning-vacances-printemps",
    title: "Planning vacances de printemps",
    content:
      "Retrouvez les horaires adaptés des entraînements pendant les vacances scolaires.",

    audience: "Parents U13",
    audienceCount: 36,

    type: "information",
    typeLabel: "Information",

    status: "scheduled",
    statusLabel: "Programmée",

    publishedAt: "2024-05-20T12:10:00",
    author: "Thomas Coulon",

    priority: false,
    tone: "blue",
  },
  {
    id: "stage-ete-2024",
    title: "Stage d’été 2024",
    content:
      "Les inscriptions pour le stage d’été seront prochainement ouvertes.",

    audience: "Jeunes",
    audienceCount: 96,

    type: "event",
    typeLabel: "Événement",

    status: "draft",
    statusLabel: "Brouillon",

    publishedAt: "2024-05-22T16:05:00",
    author: "Thomas Coulon",

    priority: false,
    tone: "purple",
  },
];

export const targetedAudiences = [
  {
    id: 1,
    name: "Tout le club",
    count: 312,
    unit: "personnes",
    tone: "blue",
  },
  {
    id: 2,
    name: "U15 Garçons",
    count: 18,
    unit: "joueurs",
    tone: "blue",
  },
  {
    id: 3,
    name: "Parents U13",
    count: 36,
    unit: "contacts",
    tone: "purple",
  },
  {
    id: 4,
    name: "Bénévoles",
    count: 22,
    unit: "personnes",
    tone: "orange",
  },
  {
    id: 5,
    name: "Seniors 1",
    count: 14,
    unit: "joueurs",
    tone: "blue",
  },
] as const;

export const broadcastChannels = [
  {
    id: 1,
    name: "Application",
    status: "Envoyé",
    type: "application",
  },
  {
    id: 2,
    name: "E-mail",
    status: "Envoyé",
    type: "email",
  },
  {
    id: 3,
    name: "Notification push",
    status: "Activé",
    type: "notification",
  },
] as const;

export const scheduledAnnouncements = [
  {
    id: 1,
    title: "Assemblée générale du club",
    publicationDate: "Publié le 2 juin 2024 à 09h00",
    delay: "Dans 9 jours",
  },
  {
    id: 2,
    title: "Stage d’été 2024",
    publicationDate: "Publié le 5 juin 2024 à 10h00",
    delay: "Dans 12 jours",
  },
  {
    id: 3,
    title: "Rentrée sportive 2024-2025",
    publicationDate: "Publié le 20 août 2024 à 09h00",
    delay: "Dans 88 jours",
  },
] as const;

export const announcementActivity = [
  {
    id: 1,
    title: 'Annonce “Tournoi de Pentecôte” publiée',
    description: "Thomas Coulon • 23 mai 2024 à 14h20",
    type: "published",
  },
  {
    id: 2,
    title: 'Brouillon “Stage d’été 2024” mis à jour',
    description: "Thomas Coulon • 22 mai 2024 à 16h05",
    type: "draft",
  },
  {
    id: 3,
    title: 'Audience “Parents U13” modifiée',
    description: "Thomas Coulon • 22 mai 2024 à 11h30",
    type: "audience",
  },
  {
    id: 4,
    title: 'Rappel “Entraînement annulé U13” envoyé',
    description: "Thomas Coulon • 21 mai 2024 à 09h00",
    type: "reminder",
  },
] as const;