export type CalendarEventType =
  | "match"
  | "training"
  | "meeting"
  | "club"
  | "stage";

export interface ClubCalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  type: CalendarEventType;
  team: string;
  location: string;
  description?: string;
}

export const eventTypeLabels: Record<
  CalendarEventType,
  string
> = {
  match: "Match",
  training: "Entraînement",
  meeting: "Réunion",
  club: "Événement du club",
  stage: "Stage / Formation",
};

export const initialCalendarEvents: ClubCalendarEvent[] = [
  {
    id: 1,
    title: "Entraînement U15 Garçons",
    date: "2024-05-01",
    time: "18:00",
    type: "training",
    team: "U15 Garçons",
    location: "Gymnase Les Lilas",
  },
  {
    id: 2,
    title: "Entraînement U13 Filles",
    date: "2024-05-02",
    time: "18:00",
    type: "training",
    team: "U13 Filles",
    location: "Gymnase des Prés",
  },
  {
    id: 3,
    title: "Réunion bénévoles",
    date: "2024-05-03",
    time: "19:00",
    type: "meeting",
    team: "Tout le club",
    location: "Salle de réunion",
  },
  {
    id: 4,
    title: "U11 vs ABC Basket",
    date: "2024-05-04",
    time: "10:00",
    type: "match",
    team: "U11 Garçons",
    location: "Gymnase Jean Moulin",
  },
  {
    id: 5,
    title: "Entraînement U17 Garçons",
    date: "2024-05-06",
    time: "18:00",
    type: "training",
    team: "U17 Garçons",
    location: "Gymnase Les Lilas",
  },
  {
    id: 6,
    title: "Entraînement U15 Garçons",
    date: "2024-05-08",
    time: "18:00",
    type: "training",
    team: "U15 Garçons",
    location: "Gymnase Les Lilas",
  },
  {
    id: 7,
    title: "Entraînement U13 Filles",
    date: "2024-05-09",
    time: "19:00",
    type: "training",
    team: "U13 Filles",
    location: "Gymnase des Prés",
  },
  {
    id: 8,
    title: "U15 vs BC Ouest",
    date: "2024-05-11",
    time: "15:30",
    type: "match",
    team: "U15 Garçons",
    location: "Gymnase Jean Moulin",
  },
  {
    id: 9,
    title: "Réunion parents U15",
    date: "2024-05-11",
    time: "17:30",
    type: "meeting",
    team: "U15 Garçons",
    location: "Salle de réunion",
  },
  {
    id: 10,
    title: "Entraînement U17 Garçons",
    date: "2024-05-13",
    time: "18:00",
    type: "training",
    team: "U17 Garçons",
    location: "Gymnase Les Lilas",
  },
  {
    id: 11,
    title: "Entraînement U15 Garçons",
    date: "2024-05-15",
    time: "18:00",
    type: "training",
    team: "U15 Garçons",
    location: "Gymnase Les Lilas",
  },
  {
    id: 12,
    title: "Entraînement U13 Filles",
    date: "2024-05-16",
    time: "18:00",
    type: "training",
    team: "U13 Filles",
    location: "Gymnase des Prés",
  },
  {
    id: 13,
    title: "Tournoi de Pentecôte",
    date: "2024-05-18",
    time: "09:00",
    type: "match",
    team: "U15 Garçons",
    location: "Complexe sportif",
  },
  {
    id: 14,
    title: "Tournoi de Pentecôte",
    date: "2024-05-19",
    time: "09:00",
    type: "match",
    team: "U15 Garçons",
    location: "Complexe sportif",
  },
  {
    id: 15,
    title: "Entraînement U17 Garçons",
    date: "2024-05-20",
    time: "18:00",
    type: "training",
    team: "U17 Garçons",
    location: "Gymnase Les Lilas",
  },
  {
    id: 16,
    title: "Entraînement U15 Garçons",
    date: "2024-05-22",
    time: "18:00",
    type: "training",
    team: "U15 Garçons",
    location: "Gymnase Les Lilas",
  },
  {
    id: 17,
    title: "Entraînement U13 Filles",
    date: "2024-05-23",
    time: "18:00",
    type: "training",
    team: "U13 Filles",
    location: "Gymnase des Prés",
  },
  {
    id: 18,
    title: "Réunion du bureau",
    date: "2024-05-23",
    time: "20:00",
    type: "meeting",
    team: "Tout le club",
    location: "Bureau du club",
  },
  {
    id: 19,
    title: "U15 Garçons vs Basket Club Sud",
    date: "2024-05-25",
    time: "15:30",
    type: "match",
    team: "U15 Garçons",
    location: "Gymnase Jean Moulin",
  },
  {
    id: 20,
    title: "Buvette – Match Seniors 1",
    date: "2024-05-25",
    time: "19:00",
    type: "club",
    team: "Seniors 1",
    location: "Hall du gymnase",
  },
  {
    id: 21,
    title: "Rangement du matériel",
    date: "2024-05-25",
    time: "21:00",
    type: "meeting",
    team: "Équipe logistique",
    location: "Local matériel",
  },
  {
    id: 22,
    title: "Entraînement U17 Garçons",
    date: "2024-05-27",
    time: "18:00",
    type: "training",
    team: "U17 Garçons",
    location: "Gymnase Les Lilas",
  },
  {
    id: 23,
    title: "Entraînement U15 Garçons",
    date: "2024-05-29",
    time: "18:00",
    type: "training",
    team: "U15 Garçons",
    location: "Gymnase Les Lilas",
  },
  {
    id: 24,
    title: "Entraînement U13 Filles",
    date: "2024-05-30",
    time: "18:00",
    type: "training",
    team: "U13 Filles",
    location: "Gymnase des Prés",
  },
];

export const calendarTeams = [
  "Tout le club",
  "U11 Garçons",
  "U13 Filles",
  "U15 Garçons",
  "U17 Garçons",
  "Seniors 1",
  "Équipe logistique",
];