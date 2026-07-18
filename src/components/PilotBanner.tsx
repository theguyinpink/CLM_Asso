import { Trophy, UsersRound } from "lucide-react";
import { Link } from "react-router";

function PilotBanner() {
  return (
    <section
      className="pilot-banner page-container"
      id="interet"
      aria-label="Devenir club pilote"
    >
      <div className="pilot-content">
        <div className="pilot-icon">
          <Trophy size={42} strokeWidth={1.8} />
        </div>

        <div>
          <h2>CLM Asso est conçu avec et pour les clubs.</h2>

          <p>
            Rejoignez les premiers clubs pilotes et participez
            <br />à la création de l’outil idéal pour votre organisation.
          </p>
        </div>
      </div>

      <Link to="/manifester-mon-interet" className="pilot-button">
        <UsersRound size={21} strokeWidth={2.3} />
        <span>Montrer mon intérêt</span>
      </Link>

      <div className="pilot-decoration" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

export default PilotBanner;
