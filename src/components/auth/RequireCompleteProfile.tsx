import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { useProfile } from "../../hooks/useProfile";
import AppLoadingScreen from "./AppLoadingScreen";

interface RequireCompleteProfileProps {
  children: ReactNode;
}

function RequireCompleteProfile({ children }: RequireCompleteProfileProps) {
  const location = useLocation();
  const { profile, loading } = useProfile();

  if (loading) return <AppLoadingScreen />;

  if (!profile?.firstName?.trim() || !profile.lastName?.trim()) {
    return (
      <Navigate
        to="/completer-profil"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}

export default RequireCompleteProfile;
