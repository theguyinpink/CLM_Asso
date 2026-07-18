import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";

import { getLegalStatus } from "../../services/legalService";
import AppLoadingScreen from "./AppLoadingScreen";

interface RequireLegalAcceptanceProps {
  children: ReactNode;
}

type AcceptanceState = "loading" | "accepted" | "missing" | "error";

function RequireLegalAcceptance({ children }: RequireLegalAcceptanceProps) {
  const location = useLocation();
  const [state, setState] = useState<AcceptanceState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    void getLegalStatus()
      .then((status) => {
        if (cancelled) return;

        setState(
          status.termsOfUseAccepted && status.privacyAcknowledged
            ? "accepted"
            : "missing",
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de vérifier les conditions juridiques.",
        );
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return <AppLoadingScreen />;
  }

  if (state === "missing") {
    const next = `${location.pathname}${location.search}`;

    return (
      <Navigate
        to={`/accepter-conditions?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  if (state === "error") {
    return (
      <div className="auth-loading-screen">
        <strong>Vérification juridique indisponible</strong>
        <p>{errorMessage}</p>
      </div>
    );
  }

  return children;
}

export default RequireLegalAcceptance;
