import { useState } from "react";
import { Menu, UsersRound, X } from "lucide-react";
import { Link, NavLink } from "react-router";
import logo from "../assets/logo.png";

const navigationLinks = [
  {
    label: "Fonctionnalités",
    path: "/fonctionnalites",
  },
  {
    label: "Pour qui ?",
    path: "/pour-qui",
  },
  {
    label: "Avantages",
    path: "/avantages",
  },
  {
    label: "Tarifs",
    path: "/tarifs",
  },
  {
    label: "À propos",
    path: "/a-propos",
  },
];

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="page-container header-container">
        <Link
          to="/"
          className="brand"
          aria-label="Retour à l’accueil de CLM Asso"
          onClick={closeMenu}
        >
          <img src={logo} alt="CLM Asso" className="brand-logo" />
        </Link>

        <nav
          className={`main-navigation ${isMenuOpen ? "is-open" : ""}`}
          aria-label="Navigation principale"
        >
          {navigationLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? "navigation-link is-active" : "navigation-link"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <Link
          to="/manifester-mon-interet"
          className="header-interest-button"
          onClick={closeMenu}
        >
          <UsersRound size={18} strokeWidth={2.2} />
          <span>Montrer mon intérêt</span>
        </Link>

        <button
          type="button"
          className="mobile-menu-button"
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
        >
          {isMenuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
    </header>
  );
}

export default Header;
