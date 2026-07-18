import type {
  AuthChangeEvent,
  Session,
} from "@supabase/supabase-js";
import type { FormEvent } from "react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router";

import clmAssoLogo from "../../assets/logo.png";
import AppLoadingScreen from "../../components/auth/AppLoadingScreen";
import { supabase } from "../../lib/supabase";

import "../../styles/auth.css";

function getAppBaseUrl() {
  const configuredUrl =
    import.meta.env.VITE_APP_URL?.trim();

  return (
    configuredUrl || window.location.origin
  ).replace(/\/+$/, "");
}

function getInvitationToken() {
  const searchParameters =
    new URLSearchParams(
      window.location.search,
    );

  const hashParameters =
    new URLSearchParams(
      window.location.hash.replace(
        /^#/,
        "",
      ),
    );

  return (
    searchParameters.get("token") ??
    searchParameters.get(
      "invitation_token",
    ) ??
    searchParameters.get(
      "invite_token",
    ) ??
    hashParameters.get("token") ??
    hashParameters.get(
      "invitation_token",
    ) ??
    hashParameters.get(
      "invite_token",
    ) ??
    ""
  );
}

function getAuthorizationCode() {
  const searchParameters =
    new URLSearchParams(
      window.location.search,
    );

  return (
    searchParameters.get("code") ?? ""
  );
}

function getErrorMessage(
  caughtError: unknown,
) {
  if (!(caughtError instanceof Error)) {
    return (
      "Une erreur inattendue est survenue " +
      "pendant l’acceptation de l’invitation."
    );
  }

  if (
    caughtError.message.includes(
      "Auth session missing",
    )
  ) {
    return (
      "La session liée à cette invitation est introuvable. " +
      "Rouvrez le lien depuis le dernier e-mail reçu."
    );
  }

  if (
    caughtError.message.includes(
      "Invitation invalide",
    ) ||
    caughtError.message.includes(
      "invalid invitation",
    )
  ) {
    return (
      "Cette invitation est invalide ou a expiré. " +
      "Demandez au responsable du club de vous inviter à nouveau."
    );
  }

  return caughtError.message;
}

function AcceptInvitationPage() {
  const invitationToken = useMemo(
    () => getInvitationToken(),
    [],
  );

  const authorizationCode = useMemo(
    () => getAuthorizationCode(),
    [],
  );

  const [password, setPassword] =
    useState("");

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState("");

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [
    sessionReady,
    setSessionReady,
  ] = useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  useEffect(() => {
    let componentMounted = true;

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event: AuthChangeEvent,
          session: Session | null,
        ) => {
          if (
            !componentMounted ||
            !session
          ) {
            return;
          }

          setSessionReady(true);
          setCheckingSession(false);
          setErrorMessage("");
        },
      );

    async function prepareSession() {
      try {
        const {
          data: {
            session: existingSession,
          },
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!componentMounted) {
          return;
        }

        if (existingSession) {
          setSessionReady(true);
          setCheckingSession(false);
          return;
        }

        /*
         * Avec le flux PKCE, Supabase renvoie
         * parfois un paramètre ?code= dans l’URL.
         */
        if (authorizationCode) {
          const {
            data,
            error: exchangeError,
          } =
            await supabase.auth
              .exchangeCodeForSession(
                authorizationCode,
              );

          if (exchangeError) {
            throw exchangeError;
          }

          if (!componentMounted) {
            return;
          }

          if (data.session) {
            setSessionReady(true);
            setCheckingSession(false);
            return;
          }
        }

        throw new Error(
          "Auth session missing!",
        );
      } catch (caughtError) {
        if (!componentMounted) {
          return;
        }

        console.error(
          "Erreur pendant l’ouverture de l’invitation :",
          caughtError,
        );

        setErrorMessage(
          getErrorMessage(caughtError),
        );

        setCheckingSession(false);
      }
    }

    void prepareSession();

    return () => {
      componentMounted = false;
      subscription.unsubscribe();
    };
  }, [authorizationCode]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!invitationToken) {
      setErrorMessage(
        "Le jeton de l’invitation est introuvable dans le lien.",
      );
      return;
    }

    if (!sessionReady) {
      setErrorMessage(
        "La session de l’invitation n’est pas encore disponible. Rouvrez le dernier e-mail reçu.",
      );
      return;
    }

    if (password.length < 10) {
      setErrorMessage(
        "Le mot de passe doit contenir au moins 10 caractères.",
      );
      return;
    }

    if (
      password !==
      passwordConfirmation
    ) {
      setErrorMessage(
        "Les deux mots de passe ne correspondent pas.",
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: {
          session,
        },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        throw new Error(
          "Auth session missing!",
        );
      }

      /*
       * Enregistre le mot de passe du compte
       * créé par l’invitation Supabase.
       */
      const {
        error: passwordError,
      } =
        await supabase.auth.updateUser({
          password,
        });

      if (passwordError) {
        throw passwordError;
      }

      /*
       * Rattache l’utilisateur au club et
       * marque l’invitation comme acceptée.
       */
      const {
        data: clubId,
        error: invitationError,
      } =
        await supabase.rpc(
          "clm_asso_accept_invitation",
          {
            p_token:
              invitationToken,
          },
        );

      if (invitationError) {
        throw invitationError;
      }

      if (!clubId) {
        throw new Error(
          "Le club correspondant à cette invitation est introuvable.",
        );
      }

      /*
       * Actualise la session avant que
       * l’application recharge les adhésions.
       */
      const {
        error: refreshError,
      } =
        await supabase.auth
          .refreshSession();

      if (refreshError) {
        console.warn(
          "La session n’a pas pu être rafraîchie :",
          refreshError,
        );
      }

      setSuccessMessage(
        "Bienvenue dans le club ! Redirection vers votre espace…",
      );

      /*
       * Retire le code Supabase et le token
       * d’invitation de l’historique.
       */
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname,
      );

      const destination =
        `${getAppBaseUrl()}/app`;

      /*
       * Le rechargement complet oblige les
       * contextes utilisateur et club à récupérer
       * la nouvelle adhésion.
       */
      window.setTimeout(() => {
        window.location.replace(
          destination,
        );
      }, 600);
    } catch (caughtError) {
      console.error(
        "Erreur pendant l’acceptation de l’invitation :",
        caughtError,
      );

      setErrorMessage(
        getErrorMessage(caughtError),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return <AppLoadingScreen />;
  }

  return (
    <main className="auth-page">
      <section className="auth-presentation">
        <Link
          to="/"
          className="auth-brand"
          aria-label="Retour à l’accueil de CLM Asso"
        >
          <img
            src={clmAssoLogo}
            alt="CLM Asso"
          />
        </Link>

        <div>
          <span className="auth-presentation-badge">
            <ShieldCheck size={16} />
            Invitation sécurisée
          </span>

          <h1>
            Rejoignez votre club,
            <span> en quelques instants.</span>
          </h1>

          <p>
            Choisissez votre mot de passe
            pour accéder aux informations,
            équipes et activités de votre club.
          </p>
        </div>

        <div className="auth-presentation-feature">
          <UsersRound size={22} />

          <div>
            <strong>
              Votre espace personnel
            </strong>

            <span>
              Retrouvez uniquement les
              fonctionnalités auxquelles votre
              rôle vous donne accès.
            </span>
          </div>
        </div>
      </section>

      <section className="auth-form-section">
        <form
          className="auth-form-card"
          onSubmit={handleSubmit}
        >
          <header>
            <span>
              Invitation au club
            </span>

            <h2>
              Définir votre mot de passe
            </h2>

            <p>
              Votre invitation a été reconnue.
              Créez maintenant votre mot de passe
              pour accéder à l’espace du club.
            </p>
          </header>

          {errorMessage && (
            <div className="auth-message auth-message--error">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="auth-message auth-message--success">
              <CheckCircle2 size={18} />
              {successMessage}
            </div>
          )}

          {sessionReady &&
            !successMessage && (
              <>
                <label>
                  Nouveau mot de passe

                  <div className="auth-input">
                    <LockKeyhole
                      size={17}
                    />

                    <input
                      type="password"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      autoComplete="new-password"
                      minLength={10}
                      placeholder="10 caractères minimum"
                      required
                      disabled={submitting}
                    />
                  </div>
                </label>

                <label>
                  Confirmer le mot de passe

                  <div className="auth-input">
                    <LockKeyhole
                      size={17}
                    />

                    <input
                      type="password"
                      value={
                        passwordConfirmation
                      }
                      onChange={(event) =>
                        setPasswordConfirmation(
                          event.target.value,
                        )
                      }
                      autoComplete="new-password"
                      minLength={10}
                      placeholder="Saisissez-le à nouveau"
                      required
                      disabled={submitting}
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  className="auth-submit-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Enregistrement…"
                    : "Accéder à mon club"}

                  {!submitting && (
                    <ArrowRight
                      size={17}
                    />
                  )}
                </button>
              </>
            )}

          <footer>
            <p>
              Déjà inscrit ?{" "}
              <Link to="/connexion">
                Se connecter
              </Link>
            </p>

            <Link to="/">
              Retour au site
            </Link>
          </footer>
        </form>
      </section>
    </main>
  );
}

export default AcceptInvitationPage;