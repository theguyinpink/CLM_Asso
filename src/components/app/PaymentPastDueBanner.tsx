import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { useClub } from "../../hooks/useClub";
import { supabase } from "../../lib/supabase";

interface BillingStatusRow {
  subscription_status: string;
  payment_grace_period_ends_at: string | null;
  can_manage_billing: boolean;
}

function formatGraceDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function PaymentPastDueBanner() {
  const { activeClub } = useClub();
  const [billingStatus, setBillingStatus] =
    useState<BillingStatusRow | null>(null);

  const refreshBillingStatus = useCallback(async () => {
    if (!activeClub?.id) {
      setBillingStatus(null);
      return;
    }

    const { data, error } = await supabase.rpc(
      "clm_asso_get_club_subscription",
      {
        p_club_id: activeClub.id,
      },
    );

    if (error) {
      // Le bandeau ne doit jamais empêcher l'utilisation de l'application.
      console.error(
        "Impossible de charger le statut de facturation :",
        error,
      );
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    setBillingStatus((row ?? null) as BillingStatusRow | null);
  }, [activeClub?.id]);

  useEffect(() => {
    void refreshBillingStatus();

    const intervalId = window.setInterval(() => {
      void refreshBillingStatus();
    }, 60_000);

    function handleFocus() {
      void refreshBillingStatus();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshBillingStatus();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [refreshBillingStatus]);

  if (billingStatus?.subscription_status !== "past_due") {
    return null;
  }

  const graceDate = formatGraceDate(
    billingStatus.payment_grace_period_ends_at,
  );

  return (
    <aside className="app-payment-warning" role="alert">
      <div className="app-payment-warning__icon" aria-hidden="true">
        <AlertTriangle size={20} />
      </div>

      <div className="app-payment-warning__content">
        <strong>Votre dernier paiement a échoué.</strong>

        <span>
          {graceDate
            ? `Votre accès reste ouvert jusqu’au ${graceDate}. Régularisez le paiement pour éviter la suspension de votre espace.`
            : "Régularisez votre paiement pour éviter la suspension de votre espace."}
        </span>
      </div>

      {billingStatus.can_manage_billing ? (
        <Link
          to="/app/abonnement"
          className="app-payment-warning__action"
        >
          Gérer mon abonnement
          <ArrowRight size={16} />
        </Link>
      ) : (
        <span className="app-payment-warning__owner-note">
          Contactez le propriétaire ou un administrateur du club.
        </span>
      )}
    </aside>
  );
}

export default PaymentPastDueBanner;
