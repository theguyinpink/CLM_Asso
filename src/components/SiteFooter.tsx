import { Link } from "react-router";

import logo from "../assets/logo.png";
import { LEGAL_CONFIG } from "../legal/legalConfig";

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-container site-footer__content">
        <div className="site-footer__brand">
          <Link to="/" aria-label="Retour à l’accueil de CLM Asso">
            <img src={logo} alt="CLM Asso" />
          </Link>
          <p>
            La plateforme de gestion pensée pour centraliser le quotidien des
            clubs sportifs.
          </p>
        </div>

        <nav className="site-footer__links" aria-label="Liens juridiques">
          <Link to={LEGAL_CONFIG.documents.legalNotice.route}>
            Mentions légales
          </Link>
          <Link to={LEGAL_CONFIG.documents.privacy.route}>
            Confidentialité
          </Link>
          <Link to={LEGAL_CONFIG.documents.termsOfUse.route}>CGU</Link>
          <Link to={LEGAL_CONFIG.documents.termsOfSale.route}>CGV</Link>
          <Link to={LEGAL_CONFIG.documents.cookies.route}>Cookies</Link>
        </nav>

        <div className="site-footer__bottom">
          <span>© 2026 Maison CLM. Tous droits réservés.</span>
          <a href={`mailto:${LEGAL_CONFIG.email}`}>{LEGAL_CONFIG.email}</a>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
