import {
  CircleHelp,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  MessagesSquare,
  Settings,
  ShieldCheck,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { NavLink } from "react-router";

import logo from "../../assets/logo.png";
import { useClub } from "../../hooks/useClub";
import { usePermissions } from "../../hooks/usePermissions";
import { subscriptionAllowsAppAccess } from "../../types/billing";
import type { ClubRole } from "../../types/club";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const clubRoleLabels: Record<ClubRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  manager: "Responsable",
  coach: "Entraîneur",
  member: "Membre",
};

const navigationItems = [
  {
    label: "Tableau de bord",
    path: "/app/tableau-de-bord",
    icon: LayoutDashboard,
  },
  {
    label: "Messagerie",
    path: "/app/messagerie",
    icon: MessagesSquare,
  },
  {
    label: "Équipes",
    path: "/app/equipes",
    icon: UsersRound,
  },
  {
    label: "Calendrier",
    path: "/app/calendrier",
    icon: CalendarDays,
  },
  {
    label: "Matchs",
    path: "/app/matchs",
    icon: Trophy,
  },
  {
    label: "Convocations",
    path: "/app/convocations",
    icon: ClipboardCheck,
  },
  {
    label: "Annonces",
    path: "/app/annonces",
    icon: Megaphone,
  },
  {
    label: "Tâches",
    path: "/app/taches",
    icon: ListChecks,
  },
  {
    label: "Membres",
    path: "/app/membres",
    icon: UsersRound,
  },
  {
    label: "Documents",
    path: "/app/documents",
    icon: FileText,
  },
  {
    label: "Abonnement",
    path: "/app/abonnement",
    icon: CreditCard,
  },
  {
    label: "Paramètres",
    path: "/app/parametres",
    icon: Settings,
  },
];

function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const {
    activeClub,
    activeMembership,
    activeSubscription,
    subscriptionLoading,
  } = useClub();

  const { canAccessTasks, canAccessDocuments, canAccessMessaging } =
    usePermissions();

  const clubName = activeClub?.name?.trim() || "Mon club";
  const roleLabel = activeMembership
    ? clubRoleLabels[activeMembership.role]
    : "Membre";
  const hasAppAccess = subscriptionAllowsAppAccess(
    activeSubscription?.status,
    activeSubscription?.paymentGracePeriodEndsAt,
  );

  const visibleNavigationItems = navigationItems.filter((item) => {
    if (!subscriptionLoading && !hasAppAccess) {
      return item.path === "/app/abonnement";
    }

    if (item.path === "/app/taches") {
      return canAccessTasks;
    }

    if (item.path === "/app/documents") {
      return canAccessDocuments;
    }

    if (item.path === "/app/messagerie") {
      return canAccessMessaging;
    }

    return true;
  });

  return (
    <aside className={`app-sidebar ${isOpen ? "app-sidebar--open" : ""}`}>
      <div className="app-sidebar__top">
        <NavLink to="/" className="app-sidebar__logo" onClick={onClose}>
          <img src={logo} alt="CLM Asso" />
        </NavLink>

        <button
          type="button"
          className="app-sidebar__close"
          onClick={onClose}
          aria-label="Fermer le menu"
        >
          <X size={22} />
        </button>
      </div>

      <nav
        className="app-sidebar__navigation"
        aria-label="Navigation de l’application"
      >
        {visibleNavigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                isActive
                  ? "app-sidebar__link app-sidebar__link--active"
                  : "app-sidebar__link"
              }
            >
              <Icon size={19} strokeWidth={1.9} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      
      <NavLink
        to="/app/aide"
        onClick={onClose}
        className={({ isActive }) =>
          isActive
            ? "app-sidebar__support app-sidebar__support--active"
            : "app-sidebar__support"
        }
      >
        <CircleHelp size={17} strokeWidth={1.9} />
        <span>Aide et informations légales</span>
      </NavLink>

      <div className="app-sidebar__plan">
        <div className="app-sidebar__plan-icon">
          <ShieldCheck size={25} />
        </div>

        <div>
          <strong>{clubName}</strong>
          <span>
            {activeSubscription?.planName
              ? `${activeSubscription.planName} · ${roleLabel}`
              : roleLabel}
          </span>
        </div>
      </div>
    </aside>
  );
}

export default AppSidebar;
