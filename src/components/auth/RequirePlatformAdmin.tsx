import type { ReactNode } from "react";
import { Navigate } from "react-router";

import { usePlatformAdmin } from "../../hooks/usePlatformAdmin";
import AppLoadingScreen from "./AppLoadingScreen";

interface RequirePlatformAdminProps {
  children: ReactNode;
}

function RequirePlatformAdmin({
  children,
}: RequirePlatformAdminProps) {
  const {
    isPlatformAdmin,
    loading,
  } = usePlatformAdmin();

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (!isPlatformAdmin) {
    return (
      <Navigate
        to="/app"
        replace
      />
    );
  }

  return children;
}

export default RequirePlatformAdmin;
