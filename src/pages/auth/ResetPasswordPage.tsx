import type { FormEvent } from "react";
import { useState } from "react";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { Navigate, useNavigate } from "react-router";

import AppLoadingScreen from "../../components/auth/AppLoadingScreen";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/auth.css";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { user, loading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) return <AppLoadingScreen />;
  if (!user) return <Navigate to="/mot-de-passe-oublie" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Le mot de passe doit contenir au moins 10 caractères.");
      return;
    }

    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      navigate("/app", { replace: true });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de modifier le mot de passe.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page--single">
      <section className="auth-form-section">
        <form className="auth-form-card" onSubmit={handleSubmit}>
          <header>
            <span>Sécurité Maison CLM</span>
            <h2>Choisir un nouveau mot de passe</h2>
            <p>Ce mot de passe sera utilisé sur les services Maison CLM liés à ce compte.</p>
          </header>

          <label>
            Nouveau mot de passe
            <div className="auth-input">
              <LockKeyhole size={17} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={10}
                required
              />
            </div>
          </label>

          <label>
            Confirmer le mot de passe
            <div className="auth-input">
              <LockKeyhole size={17} />
              <input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                minLength={10}
                required
              />
            </div>
          </label>

          {error && <div className="auth-message auth-message--error">{error}</div>}

          <button className="auth-submit-button" type="submit" disabled={submitting}>
            <CheckCircle2 size={17} />
            {submitting ? "Enregistrement…" : "Enregistrer le mot de passe"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
