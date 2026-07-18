import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Megaphone,
  UserRoundCheck,
} from "lucide-react";

export const teamTrainings = [
  {
    id: 1,
    dayLabel: "MAR.",
    day: "21",
    month: "MAI",
    title: "Entraînement",
    time: "18h30 – 20h00",
    location: "Gymnase Les Lilas",
  },
  {
    id: 2,
    dayLabel: "JEU.",
    day: "23",
    month: "MAI",
    title: "Entraînement",
    time: "18h30 – 20h00",
    location: "Gymnase Les Lilas",
  },
];

export const teamAnnouncements = [
  {
    id: 1,
    title: "Tournoi de Pentecôte",
    description:
      "Tournoi le 15 mai – Merci de confirmer votre présence.",
    time: "Il y a 1 jour",
    tone: "orange",
  },
  {
    id: 2,
    title: "Entraînement annulé",
    description:
      "Pas d’entraînement ce vendredi 17 mai, gymnase indisponible.",
    time: "Il y a 3 jours",
    tone: "red",
  },
  {
    id: 3,
    title: "Match du week-end",
    description:
      "Rappel : match samedi à 15h30 à domicile.",
    time: "Il y a 5 jours",
    tone: "purple",
  },
];

export const teamStaff = [
  {
    id: 1,
    initials: "JM",
    name: "Julien Moreau",
    role: "Coach principal",
    phone: "06 12 34 56 78",
  },
  {
    id: 2,
    initials: "AG",
    name: "Antoine Girard",
    role: "Assistant",
    phone: "06 23 45 67 89",
  },
  {
    id: 3,
    initials: "CP",
    name: "Claire Dupont",
    role: "Responsable équipe",
    phone: "06 34 56 78 90",
  },
  {
    id: 4,
    initials: "PM",
    name: "Paul Martin",
    role: "Référent matériel",
    phone: "06 45 67 89 01",
  },
];

export const teamPlayers = [
  {
    id: 1,
    number: 4,
    name: "Lucas Bernard",
    position: "Meneur",
    age: "14,6",
    availability: "Disponible",
    availabilityTone: "green",
    lastAnswer: "20 mai 2024",
  },
  {
    id: 2,
    number: 5,
    name: "Sami Ben Ali",
    position: "Arrière",
    age: "14,1",
    availability: "Disponible",
    availabilityTone: "green",
    lastAnswer: "19 mai 2024",
  },
  {
    id: 3,
    number: 6,
    name: "Théo Fontaine",
    position: "Ailier",
    age: "14,8",
    availability: "Incertain",
    availabilityTone: "orange",
    lastAnswer: "18 mai 2024",
  },
  {
    id: 4,
    number: 7,
    name: "Mathis Leroy",
    position: "Ailier fort",
    age: "14,3",
    availability: "Disponible",
    availabilityTone: "green",
    lastAnswer: "20 mai 2024",
  },
];

export const teamRecentActivity = [
  {
    id: 1,
    title: "Convocation envoyée pour le match vs AS Basket",
    description: "Thomas • Il y a 2 heures",
    icon: ClipboardCheck,
    tone: "blue",
  },
  {
    id: 2,
    title: "Sophie Lefèvre a répondu à la convocation",
    description: "Présent • Il y a 4 heures",
    icon: UserRoundCheck,
    tone: "blue",
  },
  {
    id: 3,
    title: "Entraînement ajouté au calendrier",
    description: "Jeudi 23 mai à 18h30 • Il y a 1 jour",
    icon: CalendarDays,
    tone: "green",
  },
  {
    id: 4,
    title: "Nouvelle annonce publiée",
    description: "Tournoi de Pentecôte • Il y a 1 jour",
    icon: Megaphone,
    tone: "orange",
  },
  {
    id: 5,
    title: "Lucas Bernard a mis à jour sa disponibilité",
    description: "Il y a 2 jours",
    icon: CheckCircle2,
    tone: "green",
  },
];