import { CheckCircle2, Clock3, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "react-router";

function Hero() {
  return (
    <section className="hero page-container" id="fonctionnalites">
      <div className="hero-content">
        <div className="development-badge">
          <span className="development-dot" />
          Application en cours de développement
        </div>

        <h1 className="hero-title">
          Toute l’organisation
          <br />
          de votre club,
          <br />
          <span>au même endroit.</span>
        </h1>

        <p className="hero-description">
          CLM Asso centralise vos équipes, matchs, convocations, présences,
          tâches et communications.
          <br />
          Gagnez du temps, simplifiez-vous la vie et fédérez votre club.
        </p>

        <Link to="/manifester-mon-interet" className="primary-interest-button">
          <UsersRound size={26} strokeWidth={2.3} />
          <span>Montrer mon intérêt</span>
        </Link>

        <div className="trust-points" aria-label="Avantages principaux">
          <div className="trust-point">
            <ShieldCheck size={19} />
            <span>Sécurisé</span>
          </div>

          <div className="trust-point">
            <CheckCircle2 size={19} />
            <span>Simple</span>
          </div>

          <div className="trust-point">
            <Clock3 size={19} />
            <span>Efficace</span>
          </div>

          <div className="trust-point">
            <UsersRound size={19} />
            <span>Pensé pour les clubs</span>
          </div>
        </div>
      </div>

      <div className="product-preview" aria-label="Aperçu de CLM Asso">
        <div className="preview-glow" />

        <div className="laptop">
          <div className="laptop-camera" />

          <div className="laptop-screen">
            <img
              src="/dashboard-preview.png"
              alt="Tableau de bord de l’application CLM Asso"
            />
          </div>

          <div className="laptop-base">
            <div className="laptop-notch" />
          </div>
        </div>

        <div className="phone">
          <div className="phone-speaker" />

          <div className="phone-screen">
            <img
              src="/dashboard-preview.png"
              alt="Version mobile de l’application CLM Asso"
            />
          </div>

          <div className="phone-home-indicator" />
        </div>
      </div>
    </section>
  );
}

export default Hero;
