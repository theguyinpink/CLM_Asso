import type { ReactNode } from "react";
import { Navigate } from "react-router";

import { useClub } from "../../hooks/useClub";
import AppLoadingScreen from "./AppLoadingScreen";

interface RequireClubProps {
  children: ReactNode;
}

function RequireClub({
  children,
}: RequireClubProps) {
  const {
    activeClub,
    loading,
    error,
  } = useClub();

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (error) {
    return (
      <div className="auth-loading-screen">
        <strong>
          Impossible de charger le club
        </strong>

        <p>{error}</p>
      </div>
    );
  }

  if (!activeClub) {
    return (
      <Navigate
        to="/creer-mon-club"
        replace
      />
    );
  }

  return children;
}

export default RequireClub;