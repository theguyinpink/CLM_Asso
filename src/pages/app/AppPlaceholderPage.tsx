import {
  ArrowLeft,
  Construction,
} from "lucide-react";
import { Link, useLocation } from "react-router";

function AppPlaceholderPage() {
  const location = useLocation();

  const pageName = location.pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replaceAll("-", " ");

  return (
    <section className="app-placeholder">
      <div className="app-placeholder__icon">
        <Construction size={38} />
      </div>

      <span>CLM Asso</span>

      <h1>
        Page « {pageName ?? "inconnue"} » en construction
      </h1>

      <p>
        Cette partie sera développée après le tableau de bord.
      </p>

      <Link to="/app/tableau-de-bord">
        <ArrowLeft size={18} />
        Retour au tableau de bord
      </Link>
    </section>
  );
}

export default AppPlaceholderPage;