import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CircleAlert,
  CreditCard,
  FileText,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";

import { useClub } from "../../hooks/useClub";
import { createSubscriptionCheckout } from "../../services/billingService";
import {
  subscriptionAllowsAppAccess,
  type SubscriptionStatus,
} from "../../types/billing";

import "../../styles/subscription.css";

const statusLabels: Record<SubscriptionStatus, string> = {
  pending_payment: "Paiement en attente",
  incomplete: "Paiement à terminer",
  incomplete_expired: "Paiement expiré",
  trialing: "Période d’essai active",
  active: "Abonnement actif",
  past_due: "Paiement en retard",
  canceled: "Abonnement résilié",
  unpaid: "Facture impayée",
  paused: "Abonnement suspendu",
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatStorage(bytes: number) {
  if (bytes <= 0) {
    return "Espace Documents non inclus";
  }

  const gigabytes = bytes / 1024 ** 3;
  return `${Number.isInteger(gigabytes) ? gigabytes : gigabytes.toFixed(1)} Go de documents`;
}

function SubscriptionPage() {
  const {
    activeClub,
    activeSubscription,
    subscriptionLoading,
    subscriptionError,
    refreshSubscription,
  } = useClub();

  const [searchParams, setSearchParams] = useSearchParams();
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");

  const checkoutResult = searchParams.get("checkout");
  const hasAccess = subscriptionAllowsAppAccess(activeSubscription?.status);

  const paymentButtonAvailable = useMemo(
    () =>
      activeSubscription?.canManageBilling === true &&
      [
        "pending_payment",
        "incomplete",
        "incomplete_expired",
        "canceled",
      ].includes(activeSubscription.status),
    [activeSubscription],
  );

  useEffect(() => {
    if (checkoutResult !== "success" || hasAccess) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const timer = window.setInterval(() => {
      attempts += 1;

      void refreshSubscription().catch(() => undefined);

      if (cancelled || attempts >= 10) {
        window.clearInterval(timer);
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [checkoutResult, hasAccess, refreshSubscription]);

  async function handleCheckout() {
    if (!activeClub) {
      return;
    }

    setStartingCheckout(true);
    setActionError("");

    try {
      const checkout = await createSubscriptionCheckout(activeClub.id);
      window.location.assign(checkout.url);
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’ouvrir le paiement Stripe.",
      );
      setStartingCheckout(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setActionError("");

    try {
      await refreshSubscription();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’actualiser l’abonnement.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  function dismissCheckoutMessage() {
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("session_id");
    setSearchParams(next, { replace: true });
  }

  if (subscriptionLoading && !activeSubscription) {
    return (
      <div className="subscription-page-state" role="status">
        <LoaderCircle size={30} />
        <strong>Chargement de l’abonnement…</strong>
      </div>
    );
  }

  if (subscriptionError || !activeSubscription) {
    return (
      <section className="subscription-page-state subscription-page-state--error">
        <CircleAlert size={34} />
        <strong>Abonnement introuvable</strong>
        <p>
          {subscriptionError ??
            "Aucun abonnement n’est encore rattaché à ce club."}
        </p>
        <button type="button" onClick={() => void handleRefresh()}>
          <RefreshCw size={16} />
          Réessayer
        </button>
      </section>
    );
  }

  const periodEnd = formatDate(activeSubscription.currentPeriodEnd);

  return (
    <div className="subscription-page">
      <header className="subscription-page__header">
        <div>
          <span>Facturation CLM Asso</span>
          <h1>Abonnement du club</h1>
          <p>
            Finalisez le paiement de {activeClub?.name ?? "votre club"} pour
            déverrouiller l’application.
          </p>
        </div>

        <span
          className={`subscription-status subscription-status--${activeSubscription.status}`}
        >
          {hasAccess ? <BadgeCheck size={16} /> : <LockKeyhole size={16} />}
          {statusLabels[activeSubscription.status]}
        </span>
      </header>

      {checkoutResult === "success" && !hasAccess && (
        <div className="subscription-alert subscription-alert--success">
          <LoaderCircle size={20} />
          <div>
            <strong>Paiement reçu par Stripe</strong>
            <p>
              Nous attendons la confirmation sécurisée du webhook. Cette page
              s’actualise automatiquement pendant quelques secondes.
            </p>
          </div>
          <button type="button" onClick={dismissCheckoutMessage}>
            Fermer
          </button>
        </div>
      )}

      {checkoutResult === "cancelled" && (
        <div className="subscription-alert subscription-alert--warning">
          <CircleAlert size={20} />
          <div>
            <strong>Paiement interrompu</strong>
            <p>Aucun abonnement n’a été activé. Vous pouvez reprendre plus tard.</p>
          </div>
          <button type="button" onClick={dismissCheckoutMessage}>
            Fermer
          </button>
        </div>
      )}

      {activeSubscription.lastPaymentError && (
        <div className="subscription-alert subscription-alert--danger">
          <CircleAlert size={20} />
          <div>
            <strong>Le dernier paiement n’a pas abouti</strong>
            <p>{activeSubscription.lastPaymentError}</p>
          </div>
        </div>
      )}

      <div className="subscription-layout">
        <article className="subscription-plan-card">
          <div className="subscription-plan-card__top">
            <span className="subscription-plan-icon">
              <ShieldCheck size={26} />
            </span>

            <div>
              <small>CLM Asso</small>
              <h2>{activeSubscription.planName}</h2>
              <p>{activeSubscription.planDescription}</p>
            </div>

            <strong className="subscription-plan-price">
              {formatPrice(
                activeSubscription.monthlyPriceCents,
                activeSubscription.currency,
              )}
              <small>/ mois</small>
            </strong>
          </div>

          <div className="subscription-plan-details">
            <span>
              <UsersRound size={17} />
              {activeSubscription.audienceLabel}
            </span>
            <span>
              <FileText size={17} />
              {formatStorage(activeSubscription.documentStorageLimitBytes)}
            </span>
            <span>
              <CreditCard size={17} />
              {activeSubscription.declaredLicenseesCount} licencié
              {activeSubscription.declaredLicenseesCount > 1 ? "s" : ""}
              {" déclaré"}
              {activeSubscription.declaredLicenseesCount > 1 ? "s" : ""}
            </span>
          </div>

          <ul className="subscription-feature-list">
            <li><Check size={17} /> Tableau de bord, équipes et membres</li>
            <li><Check size={17} /> Calendrier, matchs et convocations</li>
            <li><Check size={17} /> Annonces, tâches et messagerie interclubs</li>
            <li>
              <Check size={17} />
              {activeSubscription.documentsEnabled
                ? "Espace Documents inclus"
                : "Fonctions essentielles sans Documents"}
            </li>
          </ul>
        </article>

        <aside className="subscription-action-card">
          {hasAccess ? (
            <>
              <span className="subscription-action-card__icon subscription-action-card__icon--success">
                <BadgeCheck size={28} />
              </span>
              <h2>Votre club est activé</h2>
              <p>
                Toutes les fonctionnalités prévues par votre offre sont
                disponibles.
              </p>
              {periodEnd && (
                <small>
                  {activeSubscription.cancelAtPeriodEnd
                    ? `Accès maintenu jusqu’au ${periodEnd}`
                    : `Prochaine échéance le ${periodEnd}`}
                </small>
              )}
              <Link to="/app/tableau-de-bord" className="subscription-primary-action">
                Accéder au tableau de bord
                <ArrowRight size={17} />
              </Link>
            </>
          ) : paymentButtonAvailable ? (
            <>
              <span className="subscription-action-card__icon">
                <CreditCard size={28} />
              </span>
              <h2>Activer CLM Asso</h2>
              <p>
                Le paiement est réalisé sur la page sécurisée de Stripe. Aucun
                numéro de carte n’est enregistré par CLM Asso.
              </p>

              <button
                type="button"
                className="subscription-primary-action"
                onClick={() => void handleCheckout()}
                disabled={startingCheckout}
              >
                {startingCheckout ? (
                  <LoaderCircle size={18} />
                ) : (
                  <CreditCard size={18} />
                )}
                {startingCheckout
                  ? "Ouverture de Stripe…"
                  : `Payer ${formatPrice(
                      activeSubscription.monthlyPriceCents,
                      activeSubscription.currency,
                    )} / mois`}
              </button>

              <small>Environnement Stripe de test pendant l’intégration.</small>
            </>
          ) : (
            <>
              <span className="subscription-action-card__icon">
                <LockKeyhole size={28} />
              </span>
              <h2>Action du propriétaire requise</h2>
              <p>
                Seul le propriétaire ou un administrateur du club peut gérer
                le paiement de l’abonnement.
              </p>
            </>
          )}

          <button
            type="button"
            className="subscription-refresh-action"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
          >
            <RefreshCw size={16} />
            {refreshing ? "Actualisation…" : "Actualiser le statut"}
          </button>

          {actionError && (
            <p className="subscription-action-error" role="alert">
              {actionError}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

export default SubscriptionPage;
