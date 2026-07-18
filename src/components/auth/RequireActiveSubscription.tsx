import { LoaderCircle } from "lucide-react";
import { Navigate, Outlet } from "react-router";

import { useClub } from "../../hooks/useClub";
import { subscriptionAllowsAppAccess } from "../../types/billing";

function RequireActiveSubscription() {
  const {
    activeSubscription,
    subscriptionLoading,
  } = useClub();

  if (subscriptionLoading) {
    return (
      <div className="subscription-route-loading" role="status">
        <LoaderCircle size={26} aria-hidden="true" />
        <span>Vérification de l’abonnement…</span>
      </div>
    );
  }

  if (!subscriptionAllowsAppAccess(
      activeSubscription?.status,
      activeSubscription?.paymentGracePeriodEndsAt,
    )) {
    return <Navigate to="/app/abonnement" replace />;
  }

  return <Outlet />;
}

export default RequireActiveSubscription;
