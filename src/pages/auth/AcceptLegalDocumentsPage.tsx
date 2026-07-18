import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileCheck2, LoaderCircle, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";

import clmAssoLogo from "../../assets/logo.png";
import { LEGAL_CONFIG } from "../../legal/legalConfig";
import {
  acceptAccountLegalDocuments,
  getLegalStatus,
} from "../../services/legalService";

import "../../styles/auth.css";
import "../../styles/legal.css";

function resolveNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  if (value.startsWith("/accepter-conditions")) {
    return "/app";
  }

  return value;
}

function AcceptLegalDocumentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = useMemo(
    () => resolveNextPath(searchParams.get("next")),
    [searchParams],
  );

  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    void getLegalStatus()
      .then((status) => {
        if (cancelled) return;

        if (status.termsOfUseAccepted && status.privacyAcknowledged) {
          navigate(nextPath, { replace: true });
          return;
        }

        setLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de vérifier votre acceptation.",
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, nextPath]);

  async function handleAccept() {
    if (!accepted) {
      setErrorMessage(
        "Vous devez accepter les CGU et reconnaître avoir lu la politique de confidentialité.",
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      await acceptAccountLegalDocuments();
      navigate(nextPath, { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer votre acceptation.",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="legal-acceptance-page">
      <section className="legal-acceptance-card">
        <Link to="/" className="legal-acceptance-brand">
          <img src={clmAssoLogo} alt="CLM Asso" />
        </Link>

        <span className="legal-acceptance-icon">
          <FileCheck2 size={30} />
        </span>

        <div className="legal-acceptance-heading">
          <span>Avant de continuer</span>
          <h1>Conditions d’utilisation</h1>
          <p>
            CLM Asso doit enregistrer la version des documents juridiques que
            vous avez acceptée ou consultée.
          </p>
        </div>

        <div className="legal-acceptance-summary">
          <div>
            <ShieldCheck size={18} />
            <span>
              <strong>CGU version {LEGAL_CONFIG.documents.termsOfUse.version}</strong>
              Règles d’utilisation de la plateforme et des espaces clubs.
            </span>
          </div>
          <div>
            <ShieldCheck size={18} />
            <span>
              <strong>Confidentialité version {LEGAL_CONFIG.documents.privacy.version}</strong>
              Données traitées, prestataires, durées et exercice de vos droits.
            </span>
          </div>
        </div>

        <label className="legal-checkbox-row">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span>
            J’accepte les{" "}
            <Link to={LEGAL_CONFIG.documents.termsOfUse.route} target="_blank">
              Conditions générales d’utilisation
            </Link>{" "}
            et je reconnais avoir pris connaissance de la{" "}
            <Link to={LEGAL_CONFIG.documents.privacy.route} target="_blank">
              Politique de confidentialité
            </Link>.
          </span>
        </label>

        {errorMessage && (
          <div className="auth-message auth-message--error" role="alert">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          className="auth-submit-button"
          onClick={() => void handleAccept()}
          disabled={loading || submitting}
        >
          {loading || submitting ? (
            <LoaderCircle size={18} className="legal-spinner" />
          ) : (
            <ArrowRight size={18} />
          )}
          {loading
            ? "Vérification…"
            : submitting
              ? "Enregistrement…"
              : "Accepter et continuer"}
        </button>

        <p className="legal-acceptance-note">
          L’acceptation est horodatée et associée à votre compte. Aucune adresse
          IP supplémentaire n’est enregistrée par ce mécanisme.
        </p>
      </section>
    </main>
  );
}

export default AcceptLegalDocumentsPage;
