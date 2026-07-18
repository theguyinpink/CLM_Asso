import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  LogOut,
  Plus,
  UsersRound,
} from "lucide-react";
import {
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router";

import AppLoadingScreen from "../../components/auth/AppLoadingScreen";
import { useAuth } from "../../hooks/useAuth";
import { useClub } from "../../hooks/useClub";
import {
  clearStoredSubscriptionPlanCode,
  isSubscriptionPlanCode,
  readStoredSubscriptionPlanCode,
  storeSubscriptionPlanCode,
  SUBSCRIPTION_PLAN_LIST,
  SUBSCRIPTION_PLANS,
  validatePlanForLicensees,
} from "../../lib/subscriptionPlans";
import type { SubscriptionPlanCode } from "../../lib/subscriptionPlans";

import "../../styles/auth.css";

function resolveInitialPlanCode(
  requestedPlan: string | null,
): SubscriptionPlanCode {
  if (isSubscriptionPlanCode(requestedPlan)) {
    return requestedPlan;
  }

  return readStoredSubscriptionPlanCode() ?? "club";
}

function CreateClubPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    user,
    loading: authLoading,
    signOut,
  } = useAuth();

  const {
    activeClub,
    loading: clubLoading,
    createClub,
  } = useClub();

  const [clubName, setClubName] = useState("");

  const [seasonLabel, setSeasonLabel] =
    useState("2026 - 2027");

  const [planCode, setPlanCode] =
    useState<SubscriptionPlanCode>(() =>
      resolveInitialPlanCode(
        searchParams.get("plan"),
      ),
    );

  const [declaredLicenseesCount, setDeclaredLicenseesCount] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const selectedPlan = useMemo(
    () => SUBSCRIPTION_PLANS[planCode],
    [planCode],
  );

  useEffect(() => {
    storeSubscriptionPlanCode(planCode);

    if (searchParams.get("plan") !== planCode) {
      setSearchParams(
        { plan: planCode },
        { replace: true },
      );
    }
  }, [planCode, searchParams, setSearchParams]);

  if (authLoading || clubLoading) {
    return <AppLoadingScreen />;
  }

  if (!user) {
    return (
      <Navigate
        to={`/connexion?plan=${planCode}`}
        replace
      />
    );
  }

  if (activeClub) {
    return (
      <Navigate
        to="/app"
        replace
      />
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setErrorMessage("");

    try {
      const licenseesCount = Number.parseInt(
        declaredLicenseesCount,
        10,
      );

      if (
        !Number.isInteger(licenseesCount) ||
        licenseesCount < 1 ||
        licenseesCount > 100_000
      ) {
        throw new Error(
          "Indiquez un nombre de licenciés compris entre 1 et 100 000.",
        );
      }

      const validation = validatePlanForLicensees(
        planCode,
        licenseesCount,
      );

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      await createClub({
        name: clubName,
        seasonLabel,
        planCode,
        declaredLicenseesCount: licenseesCount,
      });

      clearStoredSubscriptionPlanCode();

      navigate("/app/abonnement", {
        replace: true,
      });
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de créer le club.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="create-club-page">
      <form
        className="create-club-card"
        onSubmit={handleSubmit}
      >
        <div className="create-club-icon">
          <Building2 size={35} />
        </div>

        <span>Première configuration</span>

        <h1>Créer l’espace de votre club</h1>

        <p>
          Renseignez le club et confirmez l’abonnement choisi avant la future étape de paiement Stripe.
        </p>

        <label>
          Nom du club

          <input
            type="text"
            value={clubName}
            onChange={(event) =>
              setClubName(event.target.value)
            }
            placeholder="Basket Club Combs"
            minLength={2}
            maxLength={160}
            required
          />
        </label>

        <div className="create-club-form-grid">
          <label>
            Saison actuelle

            <select
              value={seasonLabel}
              onChange={(event) =>
                setSeasonLabel(
                  event.target.value,
                )
              }
            >
              <option>2025 - 2026</option>
              <option>2026 - 2027</option>
              <option>2027 - 2028</option>
            </select>
          </label>

          <label>
            Nombre de licenciés

            <input
              type="number"
              min={1}
              max={100000}
              step={1}
              inputMode="numeric"
              value={declaredLicenseesCount}
              onChange={(event) =>
                setDeclaredLicenseesCount(
                  event.target.value,
                )
              }
              placeholder="Ex. 145"
              required
            />
          </label>
        </div>

        <label>
          Abonnement choisi

          <select
            value={planCode}
            onChange={(event) =>
              setPlanCode(
                event.target.value as SubscriptionPlanCode,
              )
            }
          >
            {SUBSCRIPTION_PLAN_LIST.map((plan) => (
              <option
                value={plan.code}
                key={plan.code}
              >
                {plan.name} — {plan.monthlyPrice} € / mois
              </option>
            ))}
          </select>
        </label>

        <section className="create-club-plan-summary">
          <div className="create-club-plan-summary__heading">
            <span>
              <CreditCard size={18} />
            </span>

            <div>
              <small>CLM Asso</small>
              <strong>{selectedPlan.name}</strong>
            </div>

            <b>
              {selectedPlan.monthlyPrice} €
              <small>/ mois</small>
            </b>
          </div>

          <div className="create-club-plan-summary__details">
            <span>
              <UsersRound size={15} />
              {selectedPlan.audience}
            </span>

            <span>
              <FileText size={15} />
              {selectedPlan.storageLabel}
            </span>
          </div>
        </section>

        <div className="create-club-information">
          <CheckCircle2 size={18} />

          <span>
            Tu deviendras automatiquement propriétaire du club. L’abonnement sera créé avec le statut « paiement en attente » jusqu’à la connexion de Stripe Checkout.
          </span>
        </div>

        {errorMessage && (
          <div className="auth-message auth-message--error">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          className="auth-submit-button"
          disabled={submitting}
        >
          <Plus size={18} />

          {submitting
            ? "Création…"
            : "Créer le club"}
        </button>

        <button
          type="button"
          className="create-club-signout"
          onClick={() => void signOut()}
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </form>
    </main>
  );
}

export default CreateClubPage;
