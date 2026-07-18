import {
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock3,
  Hourglass,
} from "lucide-react";

export type TaskStatus =
  | "in_progress"
  | "pending"
  | "completed"
  | "late";

export type TaskCategory =
  | "Logistique"
  | "Équipement"
  | "Administratif"
  | "Communication"
  | "Événement";

export interface ClubTask {
  id: string;
  title: string;
  description: string;

  category: TaskCategory;

  assignee: {
    name: string;
    initials: string;
  };

  dueDate: string;

  status: TaskStatus;
  statusLabel: string;
}

export const taskStatDefinitions = [
  {
    key: "all",
    label: "Toutes les tâches",
    detail: "Au total",
    tone: "blue",
    icon: ClipboardList,
  },
  {
    key: "completed",
    label: "Terminées",
    tone: "green",
    icon: CheckCircle2,
  },
  {
    key: "in_progress",
    label: "En cours",
    tone: "orange",
    icon: Clock3,
  },
  {
    key: "pending",
    label: "En attente",
    tone: "purple",
    icon: Hourglass,
  },
  {
    key: "late",
    label: "En retard",
    tone: "red",
    icon: CircleAlert,
  },
] as const;

export const tasksData: ClubTask[] = [
  {
    id: "reserver-salle-tournoi-u13",
    title: "Réserver la salle pour le tournoi U13",
    description: "Tournoi de Pentecôte",
    category: "Logistique",
    assignee: {
      name: "Thomas C.",
      initials: "TC",
    },
    dueDate: "2025-05-15",
    status: "in_progress",
    statusLabel: "En cours",
  },
  {
    id: "commander-maillots-u15",
    title: "Commander les maillots U15",
    description: "Saison 2025-2026",
    category: "Équipement",
    assignee: {
      name: "Maxime G.",
      initials: "MG",
    },
    dueDate: "2025-05-20",
    status: "in_progress",
    statusLabel: "En cours",
  },
  {
    id: "preparer-reunion-parents",
    title: "Préparer la réunion des parents",
    description: "Fin de saison",
    category: "Communication",
    assignee: {
      name: "Laura D.",
      initials: "LD",
    },
    dueDate: "2025-05-22",
    status: "pending",
    statusLabel: "En attente",
  },
  {
    id: "organiser-deplacement-lyon",
    title: "Organiser le déplacement à Lyon",
    description: "Match U18",
    category: "Logistique",
    assignee: {
      name: "Pierre D.",
      initials: "PD",
    },
    dueDate: "2025-05-25",
    status: "in_progress",
    statusLabel: "En cours",
  },
  {
    id: "demander-subvention-mairie",
    title: "Demander la subvention à la mairie",
    description: "Saison 2025-2026",
    category: "Administratif",
    assignee: {
      name: "Thomas C.",
      initials: "TC",
    },
    dueDate: "2025-05-30",
    status: "pending",
    statusLabel: "En attente",
  },
  {
    id: "nettoyage-gymnase",
    title: "Nettoyage du gymnase",
    description: "Avant le tournoi",
    category: "Logistique",
    assignee: {
      name: "Julien B.",
      initials: "JB",
    },
    dueDate: "2025-05-13",
    status: "late",
    statusLabel: "En retard",
  },
  {
    id: "preparer-documents-ag",
    title: "Préparer les documents de l’AG",
    description: "Assemblée générale",
    category: "Administratif",
    assignee: {
      name: "Thomas C.",
      initials: "TC",
    },
    dueDate: "2025-06-05",
    status: "pending",
    statusLabel: "En attente",
  },
  {
    id: "soiree-du-club",
    title: "Organiser la soirée du club",
    description: "Fin de saison",
    category: "Événement",
    assignee: {
      name: "Maxime G.",
      initials: "MG",
    },
    dueDate: "2025-06-15",
    status: "in_progress",
    statusLabel: "En cours",
  },
  {
    id: "designation-arbitres",
    title: "Confirmer la désignation des arbitres",
    description: "Match Seniors 1",
    category: "Administratif",
    assignee: {
      name: "Thomas C.",
      initials: "TC",
    },
    dueDate: "2025-05-10",
    status: "completed",
    statusLabel: "Terminée",
  },
  {
    id: "stock-buvette",
    title: "Vérifier le stock de la buvette",
    description: "Match du 17 mai",
    category: "Logistique",
    assignee: {
      name: "Julien B.",
      initials: "JB",
    },
    dueDate: "2025-05-11",
    status: "completed",
    statusLabel: "Terminée",
  },
  {
    id: "mettre-a-jour-licences",
    title: "Mettre à jour les licences",
    description: "Dossiers incomplets",
    category: "Administratif",
    assignee: {
      name: "Laura D.",
      initials: "LD",
    },
    dueDate: "2025-05-12",
    status: "completed",
    statusLabel: "Terminée",
  },
  {
    id: "reservation-bus",
    title: "Réserver le bus des Seniors 1",
    description: "Déplacement à Melun",
    category: "Logistique",
    assignee: {
      name: "Pierre D.",
      initials: "PD",
    },
    dueDate: "2025-05-28",
    status: "in_progress",
    statusLabel: "En cours",
  },
  {
    id: "relancer-parents-u13",
    title: "Relancer les parents U13",
    description: "Inscriptions au tournoi",
    category: "Communication",
    assignee: {
      name: "Laura D.",
      initials: "LD",
    },
    dueDate: "2025-05-29",
    status: "pending",
    statusLabel: "En attente",
  },
  {
    id: "inventaire-materiel",
    title: "Faire l’inventaire du matériel",
    description: "Ballons et équipements",
    category: "Équipement",
    assignee: {
      name: "Maxime G.",
      initials: "MG",
    },
    dueDate: "2025-05-08",
    status: "completed",
    statusLabel: "Terminée",
  },
  {
    id: "feuille-match-u15",
    title: "Préparer la feuille de match U15",
    description: "Match contre AS Basket",
    category: "Équipement",
    assignee: {
      name: "Thomas C.",
      initials: "TC",
    },
    dueDate: "2025-05-14",
    status: "completed",
    statusLabel: "Terminée",
  },
  {
    id: "envoyer-convocations",
    title: "Envoyer les convocations",
    description: "Matchs du week-end",
    category: "Administratif",
    assignee: {
      name: "Thomas C.",
      initials: "TC",
    },
    dueDate: "2025-05-09",
    status: "completed",
    statusLabel: "Terminée",
  },
  {
    id: "journee-portes-ouvertes",
    title: "Organiser la journée portes ouvertes",
    description: "Découverte du club",
    category: "Événement",
    assignee: {
      name: "Maxime G.",
      initials: "MG",
    },
    dueDate: "2025-05-07",
    status: "completed",
    statusLabel: "Terminée",
  },
  {
    id: "dossier-partenaires",
    title: "Préparer le dossier partenaires",
    description: "Recherche de sponsors",
    category: "Communication",
    assignee: {
      name: "Laura D.",
      initials: "LD",
    },
    dueDate: "2025-06-10",
    status: "pending",
    statusLabel: "En attente",
  },
  {
    id: "trousses-secours",
    title: "Vérifier les trousses de secours",
    description: "Avant le tournoi",
    category: "Logistique",
    assignee: {
      name: "Julien B.",
      initials: "JB",
    },
    dueDate: "2025-05-26",
    status: "in_progress",
    statusLabel: "En cours",
  },
  {
    id: "remboursements-arbitres",
    title: "Préparer les remboursements arbitres",
    description: "Matchs du mois de mai",
    category: "Équipement",
    assignee: {
      name: "Thomas C.",
      initials: "TC",
    },
    dueDate: "2025-05-06",
    status: "completed",
    statusLabel: "Terminée",
  },
  {
    id: "ballons-tournoi",
    title: "Commander les ballons du tournoi",
    description: "Tournoi de Pentecôte",
    category: "Équipement",
    assignee: {
      name: "Maxime G.",
      initials: "MG",
    },
    dueDate: "2025-05-05",
    status: "completed",
    statusLabel: "Terminée",
  },
  {
    id: "maillots-saison",
    title: "Préparer les maillots de la saison",
    description: "Vérification des tailles",
    category: "Équipement",
    assignee: {
      name: "Maxime G.",
      initials: "MG",
    },
    dueDate: "2025-06-08",
    status: "in_progress",
    statusLabel: "En cours",
  },
  {
    id: "reparer-tableau-affichage",
    title: "Faire réparer le tableau d’affichage",
    description: "Panne dans le gymnase",
    category: "Logistique",
    assignee: {
      name: "Pierre D.",
      initials: "PD",
    },
    dueDate: "2025-05-12",
    status: "late",
    statusLabel: "En retard",
  },
  {
    id: "creneaux-entrainement",
    title: "Confirmer les créneaux d’entraînement",
    description: "Planning de septembre",
    category: "Logistique",
    assignee: {
      name: "Pierre D.",
      initials: "PD",
    },
    dueDate: "2025-06-12",
    status: "in_progress",
    statusLabel: "En cours",
  },
];

export const taskCategories: TaskCategory[] = [
  "Logistique",
  "Équipement",
  "Administratif",
  "Communication",
  "Événement",
];