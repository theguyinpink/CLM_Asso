import {
  ShieldCheck,
  UserRound,
  UserRoundCog,
  UsersRound,
} from "lucide-react";

export type MemberRole =
  | "Président"
  | "Vice-président"
  | "Secrétaire"
  | "Trésorier"
  | "Entraîneur"
  | "Coach"
  | "Parent"
  | "Joueur";

export type MemberRoleTone =
  | "purple"
  | "blue"
  | "green"
  | "orange"
  | "cyan"
  | "grey";

export type MemberStatus =
  | "active"
  | "invited"
  | "inactive";

export interface MemberActivity {
  id: number;
  title: string;
  description: string;
  time: string;
  tone: "blue" | "green" | "orange" | "purple";
}

export interface ClubMember {
  id: string;
  initials: string;
  name: string;
  email: string;
  phone: string;

  role: MemberRole;
  roleTone: MemberRoleTone;

  teams: string[];

  status: MemberStatus;
  statusLabel: string;

  lastConnection: string;
  joinedAt: string;
  isOnline: boolean;

  roleDescription: string;
  permissions: string[];
  activities: MemberActivity[];
}

export const memberStats = [
  {
    label: "Membres actifs",
    value: 128,
    detail: "+5 ce mois-ci",
    tone: "blue",
    icon: UsersRound,
  },
  {
    label: "Administrateurs",
    value: 7,
    detail: "Club",
    tone: "green",
    icon: ShieldCheck,
  },
  {
    label: "Encadrants",
    value: 18,
    detail: "Entraîneurs, coachs…",
    tone: "orange",
    icon: UserRoundCog,
  },
  {
    label: "Membres",
    value: 103,
    detail: "Joueurs, parents…",
    tone: "purple",
    icon: UserRound,
  },
] as const;

export const memberRoleOptions: MemberRole[] = [
  "Président",
  "Vice-président",
  "Secrétaire",
  "Trésorier",
  "Entraîneur",
  "Coach",
  "Parent",
  "Joueur",
];

export const memberTeamOptions = [
  "U11 Garçons",
  "U13 Filles",
  "U15 Garçons",
  "U18 Garçons",
  "U18 Filles",
  "Seniors 1",
  "Seniors 2",
  "Loisirs",
];

export const roleToneMap: Record<
  MemberRole,
  MemberRoleTone
> = {
  Président: "purple",
  "Vice-président": "blue",
  Secrétaire: "cyan",
  Trésorier: "orange",
  Entraîneur: "blue",
  Coach: "purple",
  Parent: "grey",
  Joueur: "grey",
};

export const roleDescriptionMap: Record<
  MemberRole,
  string
> = {
  Président:
    "Accès complet à toutes les fonctionnalités et paramètres du club.",

  "Vice-président":
    "Accès aux fonctionnalités principales et à la gestion générale du club.",

  Secrétaire:
    "Gestion des membres, documents, licences et communications administratives.",

  Trésorier:
    "Gestion des informations financières, paiements et documents comptables.",

  Entraîneur:
    "Gestion des équipes, matchs, convocations et présences.",

  Coach:
    "Suivi sportif des joueurs, entraînements et rencontres.",

  Parent:
    "Consultation des informations et réponses aux convocations.",

  Joueur:
    "Consultation du calendrier, des annonces et réponses aux convocations.",
};

function getPermissions(role: MemberRole): string[] {
  if (role === "Président") {
    return [
      "Gérer les membres et les rôles",
      "Gérer les équipes",
      "Gérer les matchs et compétitions",
      "Envoyer des convocations",
      "Gérer les annonces",
      "Gérer les tâches",
      "Accéder aux statistiques",
      "Gérer les paramètres du club",
    ];
  }

  if (
    role === "Vice-président" ||
    role === "Secrétaire"
  ) {
    return [
      "Gérer les membres",
      "Gérer les équipes",
      "Gérer les annonces",
      "Gérer les documents",
      "Accéder aux statistiques",
    ];
  }

  if (role === "Trésorier") {
    return [
      "Consulter les membres",
      "Gérer les documents financiers",
      "Accéder aux statistiques",
    ];
  }

  if (
    role === "Entraîneur" ||
    role === "Coach"
  ) {
    return [
      "Gérer ses équipes",
      "Gérer les matchs",
      "Envoyer des convocations",
      "Suivre les présences",
      "Publier des annonces d’équipe",
    ];
  }

  return [
    "Consulter le calendrier",
    "Consulter les annonces",
    "Répondre aux convocations",
    "Modifier ses informations personnelles",
  ];
}

function getActivities(
  name: string,
): MemberActivity[] {
  return [
    {
      id: 1,
      title: "Connexion à CLM Asso",
      description: `${name} a accédé à son espace club.`,
      time: "Aujourd’hui",
      tone: "blue",
    },
    {
      id: 2,
      title: "Informations mises à jour",
      description:
        "Les informations personnelles ont été vérifiées.",
      time: "Il y a 3 jours",
      tone: "green",
    },
    {
      id: 3,
      title: "Convocation consultée",
      description:
        "Consultation de la dernière convocation reçue.",
      time: "Il y a 5 jours",
      tone: "purple",
    },
  ];
}

const featuredMembers: ClubMember[] = [
  {
    id: "thomas-carre",
    initials: "TC",
    name: "Thomas Carré",
    email: "thomas.carre@gmail.com",
    phone: "+33 6 12 34 56 78",
    role: "Président",
    roleTone: "purple",
    teams: ["Toutes"],
    status: "active",
    statusLabel: "Actif",
    lastConnection: "Aujourd’hui à 09:42",
    joinedAt: "12 septembre 2023",
    isOnline: true,
    roleDescription:
      roleDescriptionMap.Président,
    permissions: getPermissions("Président"),
    activities: getActivities("Thomas Carré"),
  },
  {
    id: "maxime-gauthier",
    initials: "MG",
    name: "Maxime Gauthier",
    email: "maxime.gauthier@gmail.com",
    phone: "+33 6 23 45 67 89",
    role: "Vice-président",
    roleTone: "blue",
    teams: ["U15 Garçons", "U18 Garçons"],
    status: "active",
    statusLabel: "Actif",
    lastConnection: "Hier à 18:30",
    joinedAt: "18 septembre 2023",
    isOnline: true,
    roleDescription:
      roleDescriptionMap["Vice-président"],
    permissions: getPermissions(
      "Vice-président",
    ),
    activities: getActivities("Maxime Gauthier"),
  },
  {
    id: "laura-dubois",
    initials: "LD",
    name: "Laura Dubois",
    email: "laura.dubois@gmail.com",
    phone: "+33 6 34 56 78 90",
    role: "Secrétaire",
    roleTone: "cyan",
    teams: ["U13 Filles"],
    status: "active",
    statusLabel: "Actif",
    lastConnection: "Hier à 12:15",
    joinedAt: "24 septembre 2023",
    isOnline: true,
    roleDescription:
      roleDescriptionMap.Secrétaire,
    permissions: getPermissions("Secrétaire"),
    activities: getActivities("Laura Dubois"),
  },
  {
    id: "julien-bernard",
    initials: "JB",
    name: "Julien Bernard",
    email: "julien.bernard@gmail.com",
    phone: "+33 6 45 67 89 01",
    role: "Trésorier",
    roleTone: "orange",
    teams: [],
    status: "active",
    statusLabel: "Actif",
    lastConnection: "5 mai 2025 à 20:11",
    joinedAt: "2 octobre 2023",
    isOnline: false,
    roleDescription:
      roleDescriptionMap.Trésorier,
    permissions: getPermissions("Trésorier"),
    activities: getActivities("Julien Bernard"),
  },
  {
    id: "pierre-durand",
    initials: "PD",
    name: "Pierre Durand",
    email: "pierre.durand@gmail.com",
    phone: "+33 6 56 78 90 12",
    role: "Entraîneur",
    roleTone: "blue",
    teams: ["U15 Garçons"],
    status: "active",
    statusLabel: "Actif",
    lastConnection: "Aujourd’hui à 08:21",
    joinedAt: "10 octobre 2023",
    isOnline: true,
    roleDescription:
      roleDescriptionMap.Entraîneur,
    permissions: getPermissions("Entraîneur"),
    activities: getActivities("Pierre Durand"),
  },
  {
    id: "sophie-martin",
    initials: "SM",
    name: "Sophie Martin",
    email: "sophie.martin@gmail.com",
    phone: "+33 6 67 89 01 23",
    role: "Coach",
    roleTone: "purple",
    teams: ["U13 Filles"],
    status: "active",
    statusLabel: "Actif",
    lastConnection: "3 mai 2025 à 16:45",
    joinedAt: "18 octobre 2023",
    isOnline: true,
    roleDescription: roleDescriptionMap.Coach,
    permissions: getPermissions("Coach"),
    activities: getActivities("Sophie Martin"),
  },
  {
    id: "romain-andre",
    initials: "RA",
    name: "Romain André",
    email: "romain.andre@gmail.com",
    phone: "+33 6 78 90 12 34",
    role: "Parent",
    roleTone: "grey",
    teams: ["U11 Garçons"],
    status: "active",
    statusLabel: "Actif",
    lastConnection: "2 mai 2025 à 19:02",
    joinedAt: "8 novembre 2023",
    isOnline: true,
    roleDescription: roleDescriptionMap.Parent,
    permissions: getPermissions("Parent"),
    activities: getActivities("Romain André"),
  },
  {
    id: "chloe-moreau",
    initials: "CM",
    name: "Chloé Moreau",
    email: "chloe.moreau@gmail.com",
    phone: "+33 6 89 01 23 45",
    role: "Joueur",
    roleTone: "grey",
    teams: ["U18 Filles"],
    status: "active",
    statusLabel: "Actif",
    lastConnection: "Aujourd’hui à 07:55",
    joinedAt: "15 novembre 2023",
    isOnline: false,
    roleDescription: roleDescriptionMap.Joueur,
    permissions: getPermissions("Joueur"),
    activities: getActivities("Chloé Moreau"),
  },
];

const generatedFirstNames = [
  "Lucas",
  "Emma",
  "Hugo",
  "Léa",
  "Noah",
  "Manon",
  "Gabriel",
  "Inès",
  "Arthur",
  "Camille",
];

const generatedLastNames = [
  "Petit",
  "Leroy",
  "Fontaine",
  "Morel",
  "Roux",
  "Fournier",
  "Girard",
  "Mercier",
  "Bonnet",
  "Dupont",
];

const generatedRoles: MemberRole[] = [
  "Joueur",
  "Parent",
  "Joueur",
  "Coach",
  "Joueur",
  "Parent",
  "Entraîneur",
  "Joueur",
];

function normalizeEmailPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(" ", "-");
}

const generatedMembers: ClubMember[] =
  Array.from({ length: 120 }, (_, index) => {
    const firstName =
      generatedFirstNames[
        index % generatedFirstNames.length
      ];

    const lastName =
      generatedLastNames[
        (index * 3) %
          generatedLastNames.length
      ];

    const name = `${firstName} ${lastName}`;
    const role =
      generatedRoles[index % generatedRoles.length];

    const team =
      memberTeamOptions[
        index % memberTeamOptions.length
      ];

    return {
      id: `membre-${index + 9}`,
      initials: `${firstName.charAt(0)}${lastName.charAt(
        0,
      )}`,
      name,
      email: `${normalizeEmailPart(
        firstName,
      )}.${normalizeEmailPart(lastName)}${
        index + 1
      }@gmail.com`,
      phone: `+33 6 ${String(
        10 + (index % 80),
      ).padStart(2, "0")} ${String(
        20 + (index % 70),
      ).padStart(2, "0")} ${String(
        30 + (index % 60),
      ).padStart(2, "0")} ${String(
        10 + (index % 80),
      ).padStart(2, "0")}`,
      role,
      roleTone: roleToneMap[role],
      teams: [team],
      status: "active",
      statusLabel: "Actif",
      lastConnection:
        index % 4 === 0
          ? "Aujourd’hui"
          : `Il y a ${(index % 12) + 1} jours`,
      joinedAt: `${(index % 25) + 1} septembre 2024`,
      isOnline: index % 3 === 0,
      roleDescription: roleDescriptionMap[role],
      permissions: getPermissions(role),
      activities: getActivities(name),
    };
  });

export const membersData: ClubMember[] = [
  ...featuredMembers,
  ...generatedMembers,
];