import { useState } from "react";
import {
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router";

import { useAuth } from "../../hooks/useAuth";
import { useClub } from "../../hooks/useClub";
import { useProfile } from "../../hooks/useProfile";

import type { ClubRole } from "../../types/club";
import AppNotifications from "./AppNotifications";

interface AppHeaderProps {
  onOpenSidebar: () => void;
}

const clubRoleLabels: Record<
  ClubRole,
  string
> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  manager: "Responsable",
  coach: "Entraîneur",
  member: "Membre",
};

function getInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  displayName: string | null | undefined,
) {
  const firstInitial =
    firstName?.trim().charAt(0) ?? "";

  const lastInitial =
    lastName?.trim().charAt(0) ?? "";

  const directInitials =
    `${firstInitial}${lastInitial}`.toUpperCase();

  if (directInitials) {
    return directInitials;
  }

  const displayInitials = displayName
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();

  return displayInitials || "MC";
}

function AppHeader({
  onOpenSidebar,
}: AppHeaderProps) {
  const navigate = useNavigate();

  const {
    signOut,
  } = useAuth();

  const {
    profile,
  } = useProfile();

  const {
    memberships,
    activeClub,
    activeMembership,
    selectClub,
  } = useClub();

  const [isClubMenuOpen, setIsClubMenuOpen] =
    useState(false);

  const [
    isProfileMenuOpen,
    setIsProfileMenuOpen,
  ] = useState(false);

  const fullName =
    [profile?.firstName, profile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    profile?.displayName?.trim() ||
    "Membre";

  const firstName =
    profile?.firstName?.trim() ||
    fullName.split(" ")[0] ||
    "Membre";

  const initials = getInitials(
    profile?.firstName,
    profile?.lastName,
    profile?.displayName,
  );

  const clubName =
    activeClub?.name?.trim() ||
    "Mon club";

  const roleLabel = activeMembership
    ? clubRoleLabels[
        activeMembership.role
      ]
    : "Membre";

  async function handleSignOut() {
    setIsProfileMenuOpen(false);

    await signOut();

    navigate("/connexion", {
      replace: true,
    });
  }

  return (
    <header className="app-header">
      <div className="app-header__club">
        <button
          type="button"
          className="app-header__menu"
          onClick={onOpenSidebar}
          aria-label="Ouvrir le menu"
        >
          <Menu size={23} />
        </button>

        <div className="app-header__dropdown-wrapper">
          <button
            type="button"
            className="app-header__club-selector"
            onClick={() => {
              setIsClubMenuOpen(
                (currentValue) =>
                  !currentValue,
              );

              setIsProfileMenuOpen(false);
            }}
            aria-expanded={isClubMenuOpen}
          >
            <span>{clubName}</span>
            <ChevronDown size={17} />
          </button>

          {isClubMenuOpen && (
            <div className="app-header__dropdown app-header__club-menu">
              <div className="app-header__dropdown-title">
                Mes espaces clubs
              </div>

              {memberships.map(
                (membership) => (
                  <button
                    type="button"
                    key={membership.id}
                    className={
                      membership.clubId ===
                      activeClub?.id
                        ? "app-header__club-option app-header__club-option--active"
                        : "app-header__club-option"
                    }
                    onClick={() => {
                      selectClub(
                        membership.clubId,
                      );

                      setIsClubMenuOpen(false);
                    }}
                  >
                    <span className="app-header__club-option-icon">
                      <Building2 size={17} />
                    </span>

                    <span className="app-header__club-option-text">
                      <strong>
                        {membership.club.name}
                      </strong>

                      <small>
                        {
                          clubRoleLabels[
                            membership.role
                          ]
                        }
                      </small>
                    </span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      <div className="app-header__account">
        <AppNotifications
          onOpen={() => {
            setIsClubMenuOpen(false);
            setIsProfileMenuOpen(false);
          }}
        />

        <div className="app-header__dropdown-wrapper">
          <button
            type="button"
            className="app-header__profile"
            onClick={() => {
              setIsProfileMenuOpen(
                (currentValue) =>
                  !currentValue,
              );

              setIsClubMenuOpen(false);
            }}
            aria-expanded={isProfileMenuOpen}
          >
            <span className="app-header__avatar">
              {initials}
            </span>

            <span className="app-header__profile-text">
              <strong>{firstName}</strong>
              <small>{roleLabel}</small>
            </span>

            <ChevronDown size={17} />
          </button>

          {isProfileMenuOpen && (
            <div className="app-header__dropdown app-header__profile-menu">
              <div className="app-header__profile-summary">
                <span className="app-header__avatar">
                  {initials}
                </span>

                <div>
                  <strong>{fullName}</strong>

                  <small>
                    {profile?.id
                      ? roleLabel
                      : "Compte Maison CLM"}
                  </small>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);

                  navigate(
                    "/app/parametres",
                  );
                }}
              >
                <UserRound size={17} />
                Mon profil
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);

                  navigate(
                    "/app/parametres",
                  );
                }}
              >
                <Settings size={17} />
                Paramètres
              </button>

              <button
                type="button"
                className="app-header__logout-button"
                onClick={() =>
                  void handleSignOut()
                }
              >
                <LogOut size={17} />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;