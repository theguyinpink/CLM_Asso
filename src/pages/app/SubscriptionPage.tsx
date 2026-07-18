import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CircleAlert,
  CreditCard,
  ExternalLink,
  FileText,
  LoaderCircle,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  SwitchCamera,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";

import { useClub } from "../../hooks/useClub";
import {
  SUBSCRIPTION_PLAN_LIST,
  type SubscriptionPlanCode,
} from "../../lib/subscriptionPlans";
import { LEGAL_CONFIG } from "../../legal/legalConfig";
import {
  createBillingPortalSession,
  createSubscriptionCheckout,
  type BillingPortalAction,
} from "../../services/billingService";
import { acceptBillingTerms } from "../../services/legalService";
import {
  subscriptionAllowsAppAccess,
  type SubscriptionStatus,
} from "../../types/billing";

import "../../styles/subscription.css";
import "../../styles/legal.css";

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
  const [portalAction, setPortalAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [billingTermsAccepted, setBillingTermsAccepted] = useState(false);

  const checkoutResult = searchParams.get("checkout");
  const portalResult = searchParams.get("portal");
  const hasAccess = subscriptionAllowsAppAccess(
    activeSubscription?.status,
    activeSubscription?.paymentGracePeriodEndsAt,
  );

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

  const canOpenPortal =
    activeSubscription?.canManageBilling === true &&
    activeSubscription.billingPortalAvailable;

  const canModifySubscription =
    canOpenPortal &&
    activeSubscription?.subscriptionManagementAvailable === true &&
    ["active", "trialing"].includes(activeSubscription.status);

  useEffect(() => {
    if (
      (checkoutResult !== "success" && portalResult !== "returned") ||
      !activeSubscription
    ) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    void refreshSubscription().catch(() => undefined);

    const timer = window.setInterval(() => {
      attempts += 1;

      void refreshSubscription().catch(() => undefined);

      if (cancelled || attempts >= 8) {
        window.clearInterval(timer);
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeSubscription, checkoutResult, portalResult, refreshSubscription]);

  async function handleCheckout() {
    if (!activeClub) {
      return;
    }

    if (!billingTermsAccepted) {
      setActionError(
        "Vous devez accepter les CGV avant de procéder au paiement.",
      );
      return;
    }

    setStartingCheckout(true);
    setActionError("");

    try {
      await acceptBillingTerms(activeClub.id);
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

  async function handlePortal(
    action: BillingPortalAction,
    targetPlanCode?: SubscriptionPlanCode,
  ) {
    if (!activeClub) {
      return;
    }

    const actionKey = targetPlanCode
      ? `${action}:${targetPlanCode}`
      : action;

    setPortalAction(actionKey);
    setActionError("");

    try {
      const portal = await createBillingPortalSession(
        activeClub.id,
        action,
        targetPlanCode,
      );
      window.location.assign(portal.url);
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’ouvrir le portail Stripe.",
      );
      setPortalAction(null);
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

  function dismissResultMessage() {
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("session_id");
    next.delete("portal");
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
  const graceEnd = formatDate(activeSubscription.paymentGracePeriodEndsAt);

  return (
    <div className="subscription-page">
      <header className="subscription-page__header">
        <div>
          <span>Facturation CLM Asso</span>
          <h1>Abonnement du club</h1>
          <p>
            {hasAccess
              ? `Gérez l’offre et la facturation de ${activeClub?.name ?? "votre club"}.`
              : `Finalisez ou régularisez l’abonnement de ${activeClub?.name ?? "votre club"}.`}
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
          <button type="button" onClick={dismissResultMessage}>
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
          <button type="button" onClick={dismissResultMessage}>
            Fermer
          </button>
        </div>
      )}

      {portalResult === "returned" && (
        <div className="subscription-alert subscription-alert--success">
          <RefreshCw size={20} />
          <div>
            <strong>Retour du portail Stripe</strong>
            <p>
              Les modifications sont en cours de synchronisation avec CLM Asso.
            </p>
          </div>
          <button type="button" onClick={dismissResultMessage}>
            Fermer
          </button>
        </div>
      )}

      {activeSubscription.status === "past_due" && graceEnd && (
        <div className="subscription-alert subscription-alert--warning">
          <CalendarClock size={20} />
          <div>
            <strong>Délai de régularisation actif</strong>
            <p>
              Le club conserve temporairement son accès jusqu’au {graceEnd}.
              Mettez le moyen de paiement à jour avant cette date.
            </p>
          </div>
        </div>
      )}

      {activeSubscription.cancelAtPeriodEnd && periodEnd && (
        <div className="subscription-alert subscription-alert--warning">
          <CalendarClock size={20} />
          <div>
            <strong>Résiliation programmée</strong>
            <p>
              L’accès reste actif jusqu’au {periodEnd}. Le portail Stripe permet
              d’annuler cette résiliation avant l’échéance.
            </p>
          </div>
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
          {canOpenPortal ? (
            <>
              <span className="subscription-action-card__icon subscription-action-card__icon--success">
                <WalletCards size={28} />
              </span>
              <h2>Gérer la facturation</h2>
              <p>
                Stripe sécurise les moyens de paiement, les factures et la
                résiliation de l’abonnement.
              </p>

              {periodEnd && (
                <small>
                  {activeSubscription.cancelAtPeriodEnd
                    ? `Accès maintenu jusqu’au ${periodEnd}`
                    : `Prochaine échéance le ${periodEnd}`}
                </small>
              )}

              <button
                type="button"
                className="subscription-primary-action"
                disabled={portalAction !== null}
                onClick={() => void handlePortal("home")}
              >
                {portalAction === "home" ? (
                  <LoaderCircle size={17} />
                ) : (
                  <ExternalLink size={17} />
                )}
                Ouvrir le portail Stripe
              </button>

              <button
                type="button"
                className="subscription-refresh-action"
                disabled={portalAction !== null}
                onClick={() => void handlePortal("payment_method")}
              >
                {portalAction === "payment_method" ? (
                  <LoaderCircle size={16} />
                ) : (
                  <CreditCard size={16} />
                )}
                Modifier le moyen de paiement
              </button>

              {activeSubscription.subscriptionManagementAvailable &&
                ["active", "trialing", "past_due"].includes(
                  activeSubscription.status,
                ) && (
                  <button
                    type="button"
                    className="subscription-danger-action"
                    disabled={portalAction !== null}
                    onClick={() => void handlePortal("cancel")}
                  >
                    {portalAction === "cancel" ? (
                      <LoaderCircle size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                    Gérer la résiliation
                  </button>
                )}
            </>
          ) : paymentButtonAvailable ? (
            <>
              <span className="subscription-action-card__icon">
                <CreditCard size={28} />
              </span>
              <h2>Activer votre club</h2>
              <p>
                Le paiement est traité sur la page sécurisée de Stripe. CLM Asso
                ne reçoit jamais les données complètes de votre carte.
              </p>

              <label className="form-check subscription-legal-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={billingTermsAccepted}
                  onChange={(event) =>
                    setBillingTermsAccepted(event.target.checked)
                  }
                />
                <span className="form-check-label">
                  J’accepte les <Link to="/cgv">CGV</Link> version {" "}
                  {LEGAL_CONFIG.documents.termsOfSale.version}.
                </span>
              </label>

              <button
                type="button"
                className="subscription-primary-action"
                disabled={startingCheckout}
                onClick={() => void handleCheckout()}
              >
                {startingCheckout ? (
                  <LoaderCircle size={17} />
                ) : (
                  <ArrowRight size={17} />
                )}
                Procéder au paiement
              </button>
            </>
          ) : (
            <>
              <span className="subscription-action-card__icon">
                <ReceiptText size={28} />
              </span>
              <h2>Informations de facturation</h2>
              <p>
                Seul le propriétaire ou un administrateur du club peut modifier
                l’abonnement.
              </p>
            </>
          )}

          <button
            type="button"
            className="subscription-refresh-action"
            disabled={refreshing}
            onClick={() => void handleRefresh()}
          >
            <RefreshCw size={15} />
            {refreshing ? "Actualisation…" : "Actualiser le statut"}
          </button>

          {hasAccess && (
            <Link
              className="subscription-dashboard-link"
              to="/app/tableau-de-bord"
            >
              Accéder au tableau de bord
              <ArrowRight size={16} />
            </Link>
          )}

          {actionError && (
            <p className="subscription-action-error" role="alert">
              {actionError}
            </p>
          )}
        </aside>
      </div>

      {canModifySubscription && (
        <section className="subscription-plan-switcher">
          <div className="subscription-plan-switcher__header">
            <div>
              <span>Changer d’offre</span>
              <h2>Une formule adaptée à la taille du club</h2>
              <p>
                CLM Asso vérifie le nombre de licenciés déclaré avant d’ouvrir
                la confirmation Stripe.
              </p>
            </div>
            <SwitchCamera size={24} />
          </div>

          <div className="subscription-plan-switcher__grid">
            {SUBSCRIPTION_PLAN_LIST.map((plan) => {
              const isCurrent = plan.code === activeSubscription.planCode;
              const isEligible =
                plan.maximumLicensees === null ||
                activeSubscription.declaredLicenseesCount <=
                  plan.maximumLicensees;
              const actionKey = `change_plan:${plan.code}`;

              return (
                <article
                  key={plan.code}
                  className={`subscription-switch-card ${isCurrent ? "subscription-switch-card--current" : ""}`}
                >
                  <div>
                    <span>{isCurrent ? "Offre actuelle" : "CLM Asso"}</span>
                    <h3>{plan.name}</h3>
                    <p>{plan.audience}</p>
                  </div>

                  <strong>
                    {plan.monthlyPrice} €
                    <small>/ mois</small>
                  </strong>

                  <ul>
                    <li><Check size={15} /> {plan.storageLabel}</li>
                    <li><Check size={15} /> Messagerie et gestion du club</li>
                  </ul>

                  <button
                    type="button"
                    disabled={
                      isCurrent ||
                      !isEligible ||
                      portalAction !== null
                    }
                    onClick={() =>
                      void handlePortal("change_plan", plan.code)
                    }
                  >
                    {portalAction === actionKey ? (
                      <LoaderCircle size={16} />
                    ) : isCurrent ? (
                      <BadgeCheck size={16} />
                    ) : (
                      <SwitchCamera size={16} />
                    )}
                    {isCurrent
                      ? "Offre actuelle"
                      : isEligible
                        ? `Passer à ${plan.name}`
                        : `Limité à ${plan.maximumLicensees} licenciés`}
                  </button>
                </article>
              );
            })}
          </div>

          <p className="subscription-plan-switcher__note">
            Stripe affiche le montant exact, les éventuels proratas et la date
            d’application avant toute confirmation. Une baisse de tarif peut être
            programmée à la prochaine échéance selon la configuration du portail.
          </p>
        </section>
      )}
    </div>
  );
}

export default SubscriptionPage;
