import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { Link } from "react-router";

import clmAssoLogo from "../../assets/logo.png";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/auth.css";

function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await resetPassword(email);
      setSent(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible d’envoyer l’e-mail de réinitialisation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page--single">
      <section className="auth-form-section">
        <form className="auth-form-card" onSubmit={handleSubmit}>
          <Link to="/" className="auth-brand auth-brand--dark">
            <img src={clmAssoLogo} alt="CLM Asso" />
          </Link>

          <header>
            <span>Compte Maison CLM</span>
            <h2>Mot de passe oublié</h2>
            <p>
              Saisissez votre adresse. Le lien permet de modifier le mot de
              passe commun à CLM Asso et CLM Sportlink.
            </p>
          </header>

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

          {error && <div className="auth-message auth-message--error">{error}</div>}
          {sent && (
            <div className="auth-message auth-message--success">
              Si un compte Maison CLM correspond à cette adresse, un e-mail de
              réinitialisation vient d’être envoyé.
            </div>
          )}

          <button className="auth-submit-button" type="submit" disabled={submitting}>
            <Send size={17} />
            {submitting ? "Envoi…" : "Envoyer le lien"}
          </button>

          <footer>
            <Link to="/connexion">
              <ArrowLeft size={14} /> Retour à la connexion
            </Link>
          </footer>
        </form>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
