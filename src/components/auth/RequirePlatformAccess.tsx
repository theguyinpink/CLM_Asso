import { Navigate, Outlet } from "react-router";

import { useClub } from "../../hooks/useClub";
import { usePlatformAdmin } from "../../hooks/usePlatformAdmin";
import { subscriptionAllowsAppAccess } from "../../types/billing";
import AppLoadingScreen from "./AppLoadingScreen";

function RequirePlatformAccess() {
  const {
    activeSubscription,
    subscriptionLoading,
  } = useClub();

  const {
    isPlatformAdmin,
    loading: platformAdminLoading,
  } = usePlatformAdmin();

  if (
    subscriptionLoading ||
    platformAdminLoading
  ) {
    return <AppLoadingScreen />;
  }

  /*
   * Un administrateur Maison CLM peut ouvrir
   * son espace club sans abonnement.
   *
   * Ce bypass dépend du statut stocké côté
   * Supabase, jamais d'une adresse e-mail
   * ou d'une variable Vite côté navigateur.
   */
  if (isPlatformAdmin) {
    return <Outlet />;
  }

  if (
    subscriptionAllowsAppAccess(
      activeSubscription?.status,
      activeSubscription
        ?.paymentGracePeriodEndsAt,
    )
  ) {
    return <Outlet />;
  }

  return (
    <Navigate
      to="/app/abonnement"
      replace
    />
  );
}

export default RequirePlatformAccess;
