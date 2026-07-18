import type { FormEvent } from "react";
import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  LogOut,
  Plus,
} from "lucide-react";
import {
  Navigate,
  useNavigate,
} from "react-router";

import AppLoadingScreen from "../../components/auth/AppLoadingScreen";
import { useAuth } from "../../hooks/useAuth";
import { useClub } from "../../hooks/useClub";

import "../../styles/auth.css";

function CreateClubPage() {
  const navigate = useNavigate();

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

  const [clubName, setClubName] =
    useState("");

  const [seasonLabel, setSeasonLabel] =
    useState("2026 - 2027");

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  if (authLoading || clubLoading) {
    return <AppLoadingScreen />;
  }

  if (!user) {
    return (
      <Navigate
        to="/connexion"
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
      await createClub({
        name: clubName,
        seasonLabel,
      });

      navigate("/app", {
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
          Cet espace contiendra les membres,
          équipes, matchs, convocations,
          annonces, tâches et documents.
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
            required
          />
        </label>

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

        <div className="create-club-information">
          <CheckCircle2 size={18} />

          <span>
            Tu deviendras automatiquement
            propriétaire et administrateur du
            club.
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