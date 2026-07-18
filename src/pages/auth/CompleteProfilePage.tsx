import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Save, UserRound } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router";

import AppLoadingScreen from "../../components/auth/AppLoadingScreen";
import { useAuth } from "../../hooks/useAuth";
import { useClub } from "../../hooks/useClub";
import { useProfile } from "../../hooks/useProfile";
import "../../styles/auth.css";

interface LocationState { from?: string }

function CompleteProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { activeClub } = useClub();
  const { profile, loading, updateProfile } = useProfile();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFirstName(profile?.firstName ?? "");
    setLastName(profile?.lastName ?? "");
  }, [profile]);

  if (authLoading || loading) return <AppLoadingScreen />;
  if (!user) return <Navigate to="/connexion" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await updateProfile({
        firstName,
        lastName,
        displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      });
      const state = location.state as LocationState | null;
      navigate(state?.from ?? (activeClub ? "/app" : "/creer-mon-club"), { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Impossible d’enregistrer le profil.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="create-club-page">
      <form className="create-club-card" onSubmit={handleSubmit}>
        <div className="create-club-icon"><UserRound size={35} /></div>
        <span>Compte Maison CLM</span>
        <h1>Compléter votre profil</h1>
        <p>Votre prénom et votre nom seront utilisés dans CLM Asso à la place du début de votre adresse e-mail.</p>
        <label>Prénom
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required minLength={2} autoComplete="given-name" />
        </label>
        <label>Nom
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} required minLength={2} autoComplete="family-name" />
        </label>
        {error && <div className="auth-message auth-message--error">{error}</div>}
        <button className="auth-submit-button" disabled={submitting} type="submit">
          <Save size={18} /> {submitting ? "Enregistrement…" : "Enregistrer mon profil"}
        </button>
      </form>
    </main>
  );
}

export default CompleteProfilePage;
