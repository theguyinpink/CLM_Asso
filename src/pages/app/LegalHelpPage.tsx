import {
  FileCheck2,
  FileLock2,
  FileText,
  MessageCircleMore,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router";

import "../../styles/legal-help.css";

const legalDocuments = [
  {
    title: "Mentions légales",
    description: "Éditeur, hébergeur et informations sur Maison CLM.",
    path: "/mentions-legales",
    icon: Scale,
  },
  {
    title: "Politique de confidentialité",
    description: "Utilisation, conservation et protection des données.",
    path: "/confidentialite",
    icon: ShieldCheck,
  },
  {
    title: "Conditions générales d’utilisation",
    description: "Règles d’utilisation de CLM Asso.",
    path: "/cgu",
    icon: FileCheck2,
  },
  {
    title: "Conditions générales de vente",
    description: "Abonnements, paiements, résiliation et facturation.",
    path: "/cgv",
    icon: FileText,
  },
  {
    title: "Cookies et traceurs",
    description: "Informations sur les technologies utilisées par le site.",
    path: "/cookies",
    icon: FileLock2,
  },
];

function LegalHelpPage() {
  return (
    <div className="legal-help-page">
      <header className="legal-help-page__heading">
        <span>Aide</span>
        <h1>Aide et informations légales</h1>
        <p>
          Retrouvez les documents de référence de CLM Asso et contactez
          directement Maison CLM depuis la messagerie interclubs.
        </p>
      </header>

      <section className="legal-help-page__contact">
        <div>
          <MessageCircleMore size={22} />

          <span>
            <strong>Besoin d’aide ?</strong>
            <small>
              Recherchez le club Maison CLM dans la messagerie pour nous écrire.
            </small>
          </span>
        </div>

        <Link to="/app/messagerie">Contacter Maison CLM</Link>
      </section>

      <section className="legal-help-page__grid">
        {legalDocuments.map((document) => {
          const Icon = document.icon;

          return (
            <Link
              key={document.path}
              to={document.path}
              target="_blank"
              rel="noreferrer"
              className="legal-help-card"
            >
              <span className="legal-help-card__icon">
                <Icon size={20} />
              </span>

              <span>
                <strong>{document.title}</strong>
                <small>{document.description}</small>
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

export default LegalHelpPage;
