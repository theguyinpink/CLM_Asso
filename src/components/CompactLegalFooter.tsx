import { Link, useLocation } from "react-router";

import "../styles/compact-legal-footer.css";

const legalLinks = [
  { label: "Mentions légales", to: "/mentions-legales" },
  { label: "Confidentialité", to: "/confidentialite" },
  { label: "CGU", to: "/cgu" },
  { label: "CGV", to: "/cgv" },
  { label: "Contact", to: "/manifester-mon-interet" },
];

function CompactLegalFooter() {
  const location = useLocation();

  if (location.pathname.startsWith("/app")) {
    return null;
  }

  return (
    <footer className="compact-legal-footer">
      <span>© {new Date().getFullYear()} Maison CLM</span>

      <nav aria-label="Informations légales">
        {legalLinks.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}

export default CompactLegalFooter;
