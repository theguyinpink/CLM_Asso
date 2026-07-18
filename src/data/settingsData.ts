import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Database,
  Download,
  Link2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

export type SettingsTabId =
  | "general"
  | "club"
  | "users_roles"
  | "notifications"
  | "integrations"
  | "subscription"
  | "security"
  | "import_export";

export interface SettingsTab {
  id: SettingsTabId;
  label: string;
}

export interface SettingsShortcut {
  id: number;
  label: string;
  target: SettingsTabId;
  icon: LucideIcon;
}

export const settingsTabs: SettingsTab[] = [
  {
    id: "general",
    label: "Général",
  },
  {
    id: "club",
    label: "Club",
  },
  {
    id: "users_roles",
    label: "Utilisateurs & rôles",
  },
  {
    id: "notifications",
    label: "Notifications",
  },
  {
    id: "integrations",
    label: "Intégrations",
  },
  {
    id: "subscription",
    label: "Abonnement",
  },
  {
    id: "security",
    label: "Sécurité",
  },
  {
    id: "import_export",
    label: "Import / Export",
  },
];

export const settingsShortcuts: SettingsShortcut[] = [
  {
    id: 1,
    label: "Gérer les utilisateurs",
    target: "users_roles",
    icon: UsersRound,
  },
  {
    id: 2,
    label: "Configurer les notifications",
    target: "notifications",
    icon: Bell,
  },
  {
    id: 3,
    label: "Intégrations externes",
    target: "integrations",
    icon: Link2,
  },
  {
    id: 4,
    label: "Exporter les données",
    target: "import_export",
    icon: Download,
  },
  {
    id: 5,
    label: "Centre de sécurité",
    target: "security",
    icon: ShieldCheck,
  },
];

export const timezoneOptions = [
  "(UTC+01:00) Paris",
  "(UTC+00:00) Londres",
  "(UTC+01:00) Bruxelles",
  "(UTC+01:00) Madrid",
  "(UTC+01:00) Berlin",
];

export const timeFormatOptions = [
  "24 heures (13:30)",
  "12 heures (1:30 PM)",
];

export const dateFormatOptions = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
];

export const languageOptions = [
  "Français",
  "English",
  "Español",
  "Deutsch",
];

export const settingsPlaceholderContent: Record<
  Exclude<SettingsTabId, "general">,
  {
    title: string;
    description: string;
    icon: LucideIcon;
  }
> = {
  club: {
    title: "Configuration du club",
    description:
      "Gérez les saisons, les catégories sportives, les installations et les informations administratives.",
    icon: Database,
  },

  users_roles: {
    title: "Utilisateurs et rôles",
    description:
      "Configurez les rôles, les permissions et les règles d’accès des membres du club.",
    icon: UsersRound,
  },

  notifications: {
    title: "Notifications",
    description:
      "Choisissez les événements qui déclenchent un e-mail, une notification ou un rappel.",
    icon: Bell,
  },

  integrations: {
    title: "Intégrations",
    description:
      "Connectez CLM Asso à vos calendriers, outils de communication et services externes.",
    icon: Link2,
  },

  subscription: {
    title: "Abonnement",
    description:
      "Consultez votre formule, votre facturation et les fonctionnalités incluses dans votre offre.",
    icon: Database,
  },

  security: {
    title: "Sécurité",
    description:
      "Contrôlez les connexions, l’authentification et la protection des données de votre club.",
    icon: ShieldCheck,
  },

  import_export: {
    title: "Importation et exportation",
    description:
      "Importez vos membres et exportez les données du club dans différents formats.",
    icon: Download,
  },
};