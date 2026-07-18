import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import clmAssoLogo from "../../assets/logo.png";
import AppLoadingScreen from "../../components/auth/AppLoadingScreen";
import { useAuth } from "../../hooks/useAuth";
import { LEGAL_CONFIG } from "../../legal/legalConfig";
import { supabase } from "../../lib/supabase";
import {
  isSubscriptionPlanCode,
  readStoredSubscriptionPlanCode,
  storeSubscriptionPlanCode,
  SUBSCRIPTION_PLANS,
} from "../../lib/subscriptionPlans";

import "../../styles/auth.css";
import "../../styles/legal.css";

type AuthMode = "login" | "register";

interface AuthPageProps {
  mode: AuthMode;
}

interface LocationState {
  from?: string;
}

function getAppBaseUrl() {
  const configuredUrl = import.meta.env.VITE_APP_URL?.trim();

  return (configuredUrl || window.location.origin).replace(/\/+$/, "");
}

function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { user, loading, signIn } = useAuth();

  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [legalAccepted, setLegalAccepted] = useState(false);

  const isLogin = mode === "login";

  const selectedPlanCode = useMemo(() => {
    const requestedPlan = searchParams.get("plan");

    if (isSubscriptionPlanCode(requestedPlan)) {
      return requestedPlan;
    }

    return readStoredSubscriptionPlanCode();
  }, [searchParams]);

  const selectedPlan = selectedPlanCode
    ? SUBSCRIPTION_PLANS[selectedPlanCode]
    : null;

  useEffect(() => {
    if (!isLogin && selectedPlanCode) {
      storeSubscriptionPlanCode(selectedPlanCode);
    }
  }, [isLogin, selectedPlanCode]);

  if (loading) {
    return <AppLoadingScreen />;
  }

  /*
   * Lorsqu'un utilisateur est déjà connecté,
   * il est envoyé vers son espace.
   *
   * Exception : la page de création de compte peut
   * terminer elle-même sa redirection vers
   * /creer-mon-club juste après l'inscription.
   */
  if (user) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        throw new Error("Veuillez saisir votre adresse e-mail.");
      }

      if (password.length < 10) {
        throw new Error(
          "Le mot de passe doit contenir au moins 10 caractères.",
        );
      }

      if (mode === "login") {
        await signIn(normalizedEmail, password);

        const locationState = location.state as LocationState | null;

        navigate(locationState?.from ?? "/app", {
          replace: true,
        });

        return;
      }

      const normalizedFirstName = firstName.trim();

      const normalizedLastName = lastName.trim();

      if (!normalizedFirstName) {
        throw new Error("Veuillez saisir votre prénom.");
      }

      if (!normalizedLastName) {
        throw new Error("Veuillez saisir votre nom.");
      }

      if (!legalAccepted) {
        throw new Error(
          "Vous devez accepter les CGU et reconnaître avoir lu la politique de confidentialité.",
        );
      }

      const appBaseUrl = getAppBaseUrl();

      const createClubPath = selectedPlanCode
        ? `/creer-mon-club?plan=${encodeURIComponent(selectedPlanCode)}`
        : "/creer-mon-club";

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,

        options: {
          emailRedirectTo: `${appBaseUrl}${createClubPath}`,

          data: {
            first_name: normalizedFirstName,

            last_name: normalizedLastName,

            full_name: `${normalizedFirstName} ${normalizedLastName}`,

            selected_plan: selectedPlanCode,

            legal_signup_accepted: true,

            accepted_terms_of_use_version:
              LEGAL_CONFIG.documents.termsOfUse.version,

            acknowledged_privacy_version:
              LEGAL_CONFIG.documents.privacy.version,
          },
        },
      });

      if (error) {
        throw error;
      }

      /*
       * Si une session existe immédiatement,
       * la confirmation d'adresse est désactivée.
       */
      if (data.session) {
        window.location.replace(`${appBaseUrl}${createClubPath}`);

        return;
      }

      setSuccessMessage(
        "Votre compte a été créé. Un e-mail de confirmation vient de vous être envoyé. Ouvrez-le pour confirmer votre adresse et créer votre club.",
      );

      setPassword("");
    } catch (caughtError) {
      console.error("Erreur d’authentification :", caughtError);

      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-presentation">
        <Link
          to="/"
          className="auth-brand"
          aria-label="Retour à l’accueil de CLM Asso"
        >
          <img src={clmAssoLogo} alt="CLM Asso" />
        </Link>

        <div>
          <span className="auth-presentation-badge">
            <ShieldCheck size={16} />
            Espace sécurisé
          </span>

          <h1>
            Toute l’organisation du club,
            <span> au même endroit.</span>
          </h1>

          <p>
            Gérez les équipes, rencontres, convocations, tâches et documents
            depuis un espace commun.
          </p>
        </div>

        <div className="auth-presentation-feature">
          <UsersRound size={22} />

          <div>
            <strong>Un espace pour tout le club</strong>

            <span>Dirigeants, encadrants, bénévoles et membres.</span>
          </div>
        </div>
      </section>

      <section className="auth-form-section">
        <form className="auth-form-card" onSubmit={handleSubmit}>
          <header>
            <span>{isLogin ? "Bienvenue" : "Créer votre compte"}</span>

            <h2>{isLogin ? "Connexion à CLM Asso" : "Rejoindre CLM Asso"}</h2>

            <p>
              {isLogin
                ? "Accédez à l’espace de votre club."
                : "Créez votre compte personnel avant de rejoindre ou créer un club."}
            </p>
          </header>

          {!isLogin && selectedPlan && (
            <div className="auth-selected-plan">
              <div>
                <span>Abonnement sélectionné</span>
                <strong>CLM Asso {selectedPlan.name}</strong>
                <small>
                  {selectedPlan.monthlyPrice} € / mois · {selectedPlan.audience}
                </small>
              </div>

              <Link to="/tarifs">Modifier</Link>
            </div>
          )}

          {!isLogin && (
            <div className="auth-name-grid">
              <label>
                Prénom
                <div className="auth-input">
                  <UserRound size={17} />

                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </div>
              </label>

              <label>
                Nom
                <div className="auth-input">
                  <UserRound size={17} />

                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </label>
            </div>
          )}

          <label>
            Adresse e-mail
            <div className="auth-input">
              <Mail size={17} />

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label>
            Mot de passe
            <div className="auth-input">
              <LockKeyhole size={17} />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={10}
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                title={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {!isLogin && (
            <label className="auth-legal-checkbox">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(event) => setLegalAccepted(event.target.checked)}
                required
              />

              <span>
                J’accepte les{" "}
                <Link
                  to={LEGAL_CONFIG.documents.termsOfUse.route}
                  target="_blank"
                  rel="noreferrer"
                >
                  Conditions générales d’utilisation
                </Link>{" "}
                et je reconnais avoir pris connaissance de la{" "}
                <Link
                  to={LEGAL_CONFIG.documents.privacy.route}
                  target="_blank"
                  rel="noreferrer"
                >
                  Politique de confidentialité
                </Link>
                .
              </span>
            </label>
          )}

          {isLogin && (
            <Link className="auth-forgot-link" to="/mot-de-passe-oublie">
              Mot de passe oublié ?
            </Link>
          )}

          {errorMessage && (
            <div className="auth-message auth-message--error">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="auth-message auth-message--success">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-button"
            disabled={submitting}
          >
            {submitting
              ? "Chargement…"
              : isLogin
                ? "Se connecter"
                : "Créer mon compte"}

            {!submitting && <ArrowRight size={17} />}
          </button>

          <footer>
            {isLogin ? (
              <p>
                Pas encore de compte ? <Link to="/inscription">S’inscrire</Link>
              </p>
            ) : (
              <p>
                Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
              </p>
            )}

            <Link to="/">Retour au site</Link>
          </footer>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
