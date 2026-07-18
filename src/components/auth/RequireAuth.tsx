import type { ReactNode } from "react";
import {
  Navigate,
  useLocation,
} from "react-router";

import { useAuth } from "../../hooks/useAuth";
import AppLoadingScreen from "./AppLoadingScreen";

interface RequireAuthProps {
  children: ReactNode;
}

function RequireAuth({
  children,
}: RequireAuthProps) {
  const location = useLocation();

  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (!user) {
    return (
      <Navigate
        to="/connexion"
        replace
        state={{
          from:
            location.pathname +
            location.search,
        }}
      />
    );
  }

  return children;
}

export default RequireAuth;